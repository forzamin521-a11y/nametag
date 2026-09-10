import * as XLSX from 'xlsx'
import type {
  ColumnMapping,
  ImportIssue,
  ImportMode,
  NametagRecord,
  WorkbookColumn,
  WorkbookInspection,
  WorkbookParseRequest,
  WorkbookParseResult,
  WorkbookSheet,
} from './import-types'

export const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024
export const MAX_RECORDS = 1_000
export const MAX_COLUMNS = 100
export const MAX_DECLARED_ROWS = 10_000
export const MAX_VISIBLE_ISSUES = 20

export class WorkbookCancelledError extends Error {
  public constructor() {
    super('Workbook import was cancelled.')
  }
}

type SheetRange = { readonly startRow: number; readonly endRow: number; readonly startColumn: number; readonly endColumn: number }
type LoadedWorkbook = { readonly workbook: XLSX.WorkBook; readonly inspection: WorkbookInspection }
type ParseOptions = { readonly signal?: AbortSignal }
type WorkerResponse = { readonly kind: 'result'; readonly id: string; readonly result: WorkbookParseResult }
type WorkbookWorker = Pick<Worker, 'postMessage' | 'terminate' | 'addEventListener' | 'removeEventListener'>
export type WorkerParseOptions = {
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly workerFactory?: () => WorkbookWorker
}

export function excelColumnLabel(index: number): string {
  let remaining = index + 1
  let label = ''
  while (remaining > 0) {
    const digit = (remaining - 1) % 26
    label = String.fromCharCode(65 + digit) + label
    remaining = Math.floor((remaining - 1) / 26)
  }
  return label
}

export function inspectWorkbook(bytes: ArrayBuffer, options: ParseOptions = {}): WorkbookInspection {
  return loadWorkbook(bytes, options).inspection
}

export function parseWorkbook(bytes: ArrayBuffer, request: WorkbookParseRequest, options: ParseOptions = {}): WorkbookParseResult {
  try {
    const loaded = loadWorkbook(bytes, options)
    const selectedIndex = request.sheetIndex ?? loaded.inspection.defaultSheetIndex
    const sheetSummary = loaded.inspection.sheets[selectedIndex]
    if (sheetSummary === undefined) return failure(issue('invalid-sheet', '선택한 워크시트를 찾을 수 없어요.'))
    const worksheet = loaded.workbook.Sheets[sheetSummary.name]
    if (worksheet === undefined) return failure(issue('invalid-sheet', '선택한 워크시트를 찾을 수 없어요.'))
    const range = getRange(worksheet, sheetSummary.name)
    const headerRow = request.headerRow ?? sheetSummary.defaultHeaderRow
    if (headerRow < range.startRow + 1 || headerRow > range.endRow + 1) return failure(issue('invalid-header-row', '선택한 머리글 행이 워크시트 범위를 벗어났어요.', sheetSummary.name, headerRow))
    const columns = columnsForRow(worksheet, range, headerRow, options.signal)
    const mapping = request.mapping ?? autoMap(columns, request.mode)
    const mappingFailure = validateMapping(mapping, request.mode, columns, sheetSummary.name)
    if (mappingFailure !== undefined) return failure(mappingFailure)
    const records: NametagRecord[] = []
    const issues: ImportIssue[] = []
    for (let row = headerRow + 1; row <= range.endRow + 1; row += 1) {
      assertNotCancelled(options.signal)
      const mappedCells = mappedCellValues(worksheet, row, mapping, request.mode)
      if (mappedCells.every((cell) => cell.isEmpty)) continue
      const rowIssues = validateMappedCells(mappedCells, request.mode, sheetSummary.name, row)
      if (rowIssues.length > 0) {
        issues.push(...rowIssues)
        continue
      }
      const name = mappedCells[0]?.text
      if (name === undefined) return failure(issue('missing-value', '이름 열을 읽을 수 없어요.', sheetSummary.name, row))
      const organization = mappedCells[1]?.text
      records.push({ name, ...(organization === undefined ? {} : { organization }), sheet: sheetSummary.name, row })
      if (records.length > MAX_RECORDS) return failure(issue('too-many-records', `명단은 최대 ${MAX_RECORDS}명까지 불러올 수 있어요.`, sheetSummary.name, row))
    }
    if (issues.length > 0) return failure(...issues)
    if (records.length === 0) return failure(issue('no-data', '머리글 아래에 불러올 명단이 없어요.', sheetSummary.name, headerRow))
    return { kind: 'success', records, inspection: loaded.inspection, sheet: sheetSummary.name, headerRow, mapping }
  } catch (error) {
    if (error instanceof WorkbookCancelledError) return failure(issue('cancelled', '파일 불러오기를 취소했어요.'))
    if (error instanceof SheetLimitError) return failure(issue('sheet-too-large', error.message, error.sheet))
    if (error instanceof WorkbookReadError) return failure(issue('invalid-workbook', error.message))
    throw error
  }
}

export function parseWorkbookInWorker(bytes: ArrayBuffer, request: WorkbookParseRequest, options: WorkerParseOptions = {}): Promise<WorkbookParseResult> {
  if (options.signal?.aborted === true) return Promise.resolve(failure(issue('cancelled', '파일 불러오기를 취소했어요.')))
  const worker = options.workerFactory?.() ?? new Worker(new URL('../workers/workbook.worker.ts', import.meta.url), { type: 'module' })
  const timeoutMs = options.timeoutMs ?? 15_000
  const id = crypto.randomUUID()
  return new Promise((resolve) => {
    let settled = false
    const finish = (result: WorkbookParseResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', cancelled)
      worker.removeEventListener('message', received)
      worker.terminate()
      resolve(result)
    }
    const cancelled = (): void => finish(failure(issue('cancelled', '파일 불러오기를 취소했어요.')))
    const received = (event: MessageEvent<WorkerResponse>): void => {
      if (event.data.kind === 'result' && event.data.id === id) finish(event.data.result)
    }
    const timeout = setTimeout(() => finish(failure(issue('invalid-workbook', '파일을 15초 안에 읽지 못했어요. 다시 저장한 파일을 사용해 주세요.'))), timeoutMs)
    options.signal?.addEventListener('abort', cancelled, { once: true })
    worker.addEventListener('message', received)
    worker.postMessage({ kind: 'parse', id, bytes, request }, [bytes])
  })
}

function loadWorkbook(bytes: ArrayBuffer, options: ParseOptions): LoadedWorkbook {
  if (bytes.byteLength > MAX_WORKBOOK_BYTES) throw new WorkbookReadError(`파일은 최대 10 MiB까지 불러올 수 있어요.`)
  if (!hasExcelFileSignature(bytes)) throw new WorkbookReadError('엑셀 파일 형식을 확인할 수 없어요. .xlsx 또는 .xls 파일을 선택해 주세요.')
  assertNotCancelled(options.signal)
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(new Uint8Array(bytes), { type: 'array', cellFormula: true, cellText: true, cellNF: false, raw: true, bookVBA: false })
  } catch (error) {
    if (error instanceof Error) throw new WorkbookReadError('엑셀 파일을 읽을 수 없어요. 파일이 손상되었거나 암호화되었을 수 있어요.')
    throw error
  }
  assertNotCancelled(options.signal)
  const sheets = workbook.SheetNames.map((name, index) => inspectSheet(workbook.Sheets[name], name, index, options.signal))
  const populated = sheets.find((sheet) => sheet.headerRows.length > 0)
  if (populated === undefined) throw new WorkbookReadError('데이터가 있는 워크시트를 찾을 수 없어요.')
  return { workbook, inspection: { sheets, defaultSheetIndex: populated.index } }
}

function inspectSheet(worksheet: XLSX.WorkSheet | undefined, name: string, index: number, signal: AbortSignal | undefined): WorkbookSheet {
  if (worksheet === undefined) throw new WorkbookReadError('워크시트를 읽을 수 없어요.')
  let range: SheetRange
  try {
    range = getRange(worksheet, name)
  } catch (error) {
    if (error instanceof WorkbookReadError) return { index, name, headerRows: [], defaultHeaderRow: 1, columns: [] }
    throw error
  }
  const headerRows: number[] = []
  for (let row = range.startRow + 1; row <= range.endRow + 1; row += 1) {
    assertNotCancelled(signal)
    if (columnsForRow(worksheet, range, row, signal).length > 0) headerRows.push(row)
  }
  const defaultHeaderRow = headerRows[0] ?? range.startRow + 1
  return { index, name, headerRows, defaultHeaderRow, columns: columnsForRow(worksheet, range, defaultHeaderRow, signal) }
}

function hasExcelFileSignature(bytes: ArrayBuffer): boolean {
  const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 8))
  const isZip = header[0] === 0x50 && header[1] === 0x4b
  const isCompoundFile = header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0 && header[4] === 0xa1 && header[5] === 0xb1 && header[6] === 0x1a && header[7] === 0xe1
  return isZip || isCompoundFile
}

function getRange(worksheet: XLSX.WorkSheet, sheet: string): SheetRange {
  const reference = worksheet['!ref']
  if (reference === undefined) throw new WorkbookReadError(`'${sheet}' 워크시트에 셀이 없어요.`)
  let decoded: XLSX.Range
  try { decoded = XLSX.utils.decode_range(reference) } catch { throw new WorkbookReadError(`'${sheet}' 워크시트 범위를 읽을 수 없어요.`) }
  const rowCount = decoded.e.r - decoded.s.r + 1
  const columnCount = decoded.e.c - decoded.s.c + 1
  if (columnCount > MAX_COLUMNS || rowCount > MAX_DECLARED_ROWS) throw new SheetLimitError(sheet, `'${sheet}' 워크시트 범위가 너무 커서 불러올 수 없어요.`)
  return { startRow: decoded.s.r, endRow: decoded.e.r, startColumn: decoded.s.c, endColumn: decoded.e.c }
}

function columnsForRow(worksheet: XLSX.WorkSheet, range: SheetRange, row: number, signal: AbortSignal | undefined): readonly WorkbookColumn[] {
  const columns: WorkbookColumn[] = []
  for (let index = range.startColumn; index <= range.endColumn; index += 1) {
    assertNotCancelled(signal)
    const cell = worksheet[XLSX.utils.encode_cell({ r: row - 1, c: index })]
    const header = cellText(cell).trim()
    if (header.length > 0) columns.push({ index, label: excelColumnLabel(index), header })
  }
  return columns
}

function autoMap(columns: readonly WorkbookColumn[], mode: ImportMode): ColumnMapping {
  const name = columns.filter((column) => column.header === '이름')
  const organization = columns.filter((column) => column.header === '소속' || column.header === '기관')
  return mode === 'name'
    ? { nameColumn: name.length === 1 && name[0] !== undefined ? name[0].index : -1 }
    : { nameColumn: name.length === 1 && name[0] !== undefined ? name[0].index : -1, organizationColumn: organization.length === 1 && organization[0] !== undefined ? organization[0].index : -1 }
}

function validateMapping(mapping: ColumnMapping, mode: ImportMode, columns: readonly WorkbookColumn[], sheet: string): ImportIssue | undefined {
  if (!columns.some((column) => column.index === mapping.nameColumn)) return issue('missing-column', '이름 열을 선택해 주세요.', sheet)
  if (mode === 'organization-name') {
    if (mapping.organizationColumn === undefined || !columns.some((column) => column.index === mapping.organizationColumn)) return issue('missing-column', '소속 열을 선택해 주세요.', sheet)
    if (mapping.organizationColumn === mapping.nameColumn) return issue('duplicate-columns', '이름과 소속에는 서로 다른 열을 선택해 주세요.', sheet)
  }
  return undefined
}

type MappedCell = { readonly text: string; readonly isEmpty: boolean; readonly formula: boolean; readonly error: boolean }

function mappedCellValues(worksheet: XLSX.WorkSheet, row: number, mapping: ColumnMapping, mode: ImportMode): readonly MappedCell[] {
  const name = toMappedCell(worksheet[XLSX.utils.encode_cell({ r: row - 1, c: mapping.nameColumn })])
  if (mode === 'name') return [name]
  const organizationColumn = mapping.organizationColumn
  if (organizationColumn === undefined) return [name]
  return [name, toMappedCell(worksheet[XLSX.utils.encode_cell({ r: row - 1, c: organizationColumn })])]
}

function toMappedCell(cell: XLSX.CellObject | undefined): MappedCell {
  return { text: cellText(cell).trim(), isEmpty: cell === undefined || cellText(cell).trim().length === 0, formula: cell?.f !== undefined, error: cell?.t === 'e' }
}

function validateMappedCells(cells: readonly MappedCell[], mode: ImportMode, sheet: string, row: number): readonly ImportIssue[] {
  const fieldNames = mode === 'name' ? ['이름'] : ['이름', '소속']
  const issues: ImportIssue[] = []
  for (const [index, cell] of cells.entries()) {
    const field = fieldNames[index]
    if (field === undefined) continue
    if (cell.formula) issues.push(issue('formula-cell', `${field} 열에 수식이 있어요. 값으로 바꿔 주세요.`, sheet, row))
    else if (cell.error) issues.push(issue('error-cell', `${field} 열에 엑셀 오류가 있어요.`, sheet, row))
    else if (cell.isEmpty) issues.push(issue('missing-value', `${field} 값이 비어 있어요.`, sheet, row))
  }
  return issues
}

function cellText(cell: XLSX.CellObject | undefined): string {
  if (cell === undefined || cell.v === undefined || cell.v === null) return ''
  return cell.w ?? String(cell.v)
}

function issue(code: ImportIssue['code'], message: string, sheet?: string, row?: number): ImportIssue {
  return { code, message, ...(sheet === undefined ? {} : { sheet }), ...(row === undefined ? {} : { row }) }
}

function failure(...issues: ImportIssue[]): WorkbookParseResult {
  return { kind: 'failure', issues: issues.slice(0, MAX_VISIBLE_ISSUES), totalIssues: issues.length }
}

function assertNotCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new WorkbookCancelledError()
}

class WorkbookReadError extends Error {}
class SheetLimitError extends Error { public constructor(public readonly sheet: string, message: string) { super(message) } }
