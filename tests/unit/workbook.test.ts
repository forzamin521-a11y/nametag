import { describe, expect, it } from 'vitest'
import { MAX_RECORDS, parseWorkbook, parseWorkbookInWorker } from '../../src/lib/workbook'
import type { WorkbookParseRequest } from '../../src/lib/import-types'
import { formulaAndErrorBytes, hostileExtentBytes, multiSheetBytes, workbookBytes } from '../fixtures/workbook-fixtures'

const nameRequest: WorkbookParseRequest = { mode: 'name' }

describe('parseWorkbook', () => {
  it.each(['xlsx', 'biff8'] as const)('preserves Unicode display text and source rows for %s files', (bookType) => {
    // Given: a local workbook with leading/trailing whitespace and an empty row.
    const bytes = workbookBytes([['이름'], ['  김민서  '], [null], ['Alex Kim']], bookType)

    // When: the name-only import is parsed.
    const result = parseWorkbook(bytes, nameRequest)

    // Then: displayed text is trimmed while Excel order and original rows remain intact.
    expect(result).toMatchObject({ kind: 'success', records: [{ name: '김민서', row: 2 }, { name: 'Alex Kim', row: 4 }] })
  })

  it('selects the first nonempty sheet and parses organization-name mode', () => {
    // Given: a workbook with an empty first sheet and a populated second sheet.
    const bytes = multiSheetBytes()

    // When: the two-field import is parsed.
    const result = parseWorkbook(bytes, { mode: 'organization-name' })

    // Then: the first populated sheet and both trimmed fields are used.
    expect(result).toMatchObject({ kind: 'success', sheet: '참가자', records: [{ organization: '한국 학교', name: '김민서', row: 2 }, { organization: '오픈AI', name: 'Alex Kim', row: 3 }] })
  })

  it('requires an explicit mapping when an exact header is ambiguous', () => {
    // Given: duplicate exact name headers.
    const bytes = workbookBytes([['이름', '이름'], ['첫째', '둘째']])

    // When: automatic mapping is requested.
    const result = parseWorkbook(bytes, nameRequest)

    // Then: it returns a usable missing-column error instead of guessing.
    expect(result).toMatchObject({ kind: 'failure', issues: [{ code: 'missing-column' }] })
  })

  it('accepts a selected header row and explicit columns', () => {
    // Given: a title row above a nonstandard header.
    const bytes = workbookBytes([['행사 명단'], ['성명', '소속'], ['서연', '미래센터']])

    // When: the caller supplies the selected row and mappings.
    const result = parseWorkbook(bytes, { mode: 'organization-name', headerRow: 2, mapping: { nameColumn: 0, organizationColumn: 1 } })

    // Then: the selected columns become the record fields.
    expect(result).toMatchObject({ kind: 'success', headerRow: 2, records: [{ name: '서연', organization: '미래센터', row: 3 }] })
  })

  it('rejects formulas and Excel errors atomically with row-specific messages', () => {
    // Given: mapped cells containing a formula and an Excel error.
    const bytes = formulaAndErrorBytes()

    // When: the workbook is parsed.
    const result = parseWorkbook(bytes, nameRequest)

    // Then: no partial roster is returned and each offending row is identified.
    expect(result).toMatchObject({ kind: 'failure', totalIssues: 2, issues: [{ code: 'formula-cell', row: 3 }, { code: 'error-cell', row: 4 }] })
  })

  it('rejects duplicate two-field mappings and missing mapped values', () => {
    // Given: a valid header with an invalid duplicate mapping.
    const bytes = workbookBytes([['이름', '기관'], ['지수', '연구소'], ['민재', null]])

    // When: both fields are mapped to the same column.
    const duplicate = parseWorkbook(bytes, { mode: 'organization-name', mapping: { nameColumn: 0, organizationColumn: 0 } })

    // Then: the mapping is rejected before reading rows.
    expect(duplicate).toMatchObject({ kind: 'failure', issues: [{ code: 'duplicate-columns' }] })
    // When: distinct fields are selected.
    const missing = parseWorkbook(bytes, { mode: 'organization-name' })
    // Then: incomplete rows reject the entire import.
    expect(missing).toMatchObject({ kind: 'failure', issues: [{ code: 'missing-value', row: 3 }] })
  })

  it('rejects malformed, oversized, excessive-extent, and over-limit workbooks', () => {
    // Given: inputs crossing each resource boundary.
    const malformed = new Uint8Array([0, 1, 2, 3]).buffer
    const oversized = new ArrayBuffer(10 * 1024 * 1024 + 1)
    const rows = [['이름'], ...Array.from({ length: MAX_RECORDS + 1 }, (_, index) => [`사람 ${index + 1}`])]

    // When: each workbook is parsed.
    const results = [parseWorkbook(malformed, nameRequest), parseWorkbook(oversized, nameRequest), parseWorkbook(hostileExtentBytes(), nameRequest), parseWorkbook(workbookBytes(rows), nameRequest)]

    // Then: each fails without a partial roster.
    expect(results.map((result) => result.kind === 'failure' ? result.issues[0]?.code : 'success')).toEqual(['invalid-workbook', 'invalid-workbook', 'sheet-too-large', 'too-many-records'])
  })

  it('returns cancellation without inspecting a stale file', () => {
    // Given: an import signal already cancelled by a newer file selection.
    const controller = new AbortController()
    controller.abort()

    // When: parsing begins after cancellation.
    const result = parseWorkbook(workbookBytes([['이름'], ['새 명단']]), nameRequest, { signal: controller.signal })

    // Then: cancellation is explicit and no records are committed.
    expect(result).toMatchObject({ kind: 'failure', issues: [{ code: 'cancelled' }] })
  })
})

describe('parseWorkbookInWorker', () => {
  it('terminates a stalled worker on timeout', async () => {
    // Given: a worker that never responds.
    let terminated = false
    const worker = { postMessage: () => undefined, terminate: () => { terminated = true }, addEventListener: () => undefined, removeEventListener: () => undefined }

    // When: the worker exceeds its bounded deadline.
    const result = await parseWorkbookInWorker(workbookBytes([['이름'], ['대기']]), nameRequest, { timeoutMs: 1, workerFactory: () => worker })

    // Then: it terminates and returns an actionable result.
    expect(result).toMatchObject({ kind: 'failure', issues: [{ code: 'invalid-workbook' }] })
    expect(terminated).toBe(true)
  })
})
