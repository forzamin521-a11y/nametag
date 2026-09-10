import { useEffect, useRef, useState } from 'react'
import { downloadTemplate } from '../lib/templates'
import type { ColumnMapping, ImportIssue, ImportMode, NametagRecord, WorkbookInspection, WorkbookSheet } from '../lib/import-types'
import { MAX_WORKBOOK_BYTES, inspectWorkbook, parseWorkbookInWorker } from '../lib/workbook'

type Props = {
  readonly open: boolean
  readonly onClose: () => void
  readonly onCommit: (records: readonly NametagRecord[], mode: ImportMode) => void
  readonly onImportingChange?: (isImporting: boolean) => void
}
type Setup = { readonly bytes: ArrayBuffer; readonly fileName: string; readonly inspection: WorkbookInspection; readonly sheetIndex: number; readonly headerRow: number; readonly mapping: ColumnMapping }

export function ImportDialog({ open, onClose, onCommit, onImportingChange }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ImportMode>('name')
  const [setup, setSetup] = useState<Setup>()
  const [issues, setIssues] = useState<readonly ImportIssue[]>([])
  const [isImporting, setIsImporting] = useState(false)
  useEffect(() => { const element = dialog.current; if (element === null) return; if (open && !element.open) element.showModal(); if (!open && element.open) element.close() }, [open])
  const resetFile = (): void => { if (input.current !== null) input.current.value = '' }
  const close = (): void => { resetFile(); setSetup(undefined); setIssues([]); onClose() }
  const chooseFile = (): void => { resetFile(); input.current?.click() }
  async function readFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]; resetFile(); if (file === undefined) return
    setIssues([])
    if (file.size > MAX_WORKBOOK_BYTES) { setSetup(undefined); setIssues([{ code: 'file-too-large', message: '파일은 최대 10 MiB까지 불러올 수 있어요.' }]); return }
    try {
      const bytes = await file.arrayBuffer(); const inspection = inspectWorkbook(bytes); const sheet = inspection.sheets[inspection.defaultSheetIndex]
      if (sheet === undefined) throw new Error('워크시트를 찾을 수 없어요.')
      setSetup({ bytes, fileName: file.name, inspection, sheetIndex: sheet.index, headerRow: sheet.defaultHeaderRow, mapping: defaultMapping(sheet, mode) })
    } catch (error) { setSetup(undefined); setIssues([{ code: 'invalid-workbook', message: error instanceof Error ? error.message : '엑셀 파일을 읽을 수 없어요.' }]) }
  }
  const sheet = setup === undefined ? undefined : setup.inspection.sheets[setup.sheetIndex]
  function setSheet(sheetIndex: number): void { if (setup === undefined) return; const next = setup.inspection.sheets[sheetIndex]; if (next !== undefined) setSetup({ ...setup, sheetIndex, headerRow: next.defaultHeaderRow, mapping: defaultMapping(next, mode) }) }
  async function commit(): Promise<void> {
    if (setup === undefined) return
    setIssues([]); setIsImporting(true); onImportingChange?.(true)
    const result = await parseWorkbookInWorker(setup.bytes.slice(0), { mode, sheetIndex: setup.sheetIndex, headerRow: setup.headerRow, mapping: setup.mapping })
    setIsImporting(false); onImportingChange?.(false)
    if (result.kind === 'failure') { setIssues(result.issues); resetFile(); return }
    onCommit(result.records, mode); close()
  }
  const columns = sheet?.columns ?? []
  return <dialog ref={dialog} className="import-dialog import-dialog-wide" aria-labelledby="import-title" onCancel={(event) => { event.preventDefault(); close() }}>
    <div className="dialog-heading"><span className="eyebrow">명단 불러오기</span><button className="close-button" type="button" aria-label="닫기" onClick={close}>×</button></div>
    <h2 id="import-title">{setup === undefined ? '어떤 명찰을 만들까요?' : '엑셀 명단을 확인해 주세요'}</h2>
    {setup === undefined ? <><p className="muted">엑셀에 들어 있는 정보에 맞춰 선택해 주세요.</p><fieldset className="mode-options"><legend className="sr-only">명찰 표시 항목</legend><label className="mode-option"><input type="radio" name="mode" checked={mode === 'name'} onChange={() => setMode('name')}/><span><strong>이름만</strong><small>이름을 크고 또렷하게 표시해요.</small></span></label><label className="mode-option"><input type="radio" name="mode" checked={mode === 'organization-name'} onChange={() => setMode('organization-name')}/><span><strong>소속 + 이름</strong><small>이름 위에 소속을 함께 표시해요.</small></span></label></fieldset><div className="template-row"><span>처음이신가요?</span><button className="text-button" type="button" onClick={() => downloadTemplate(mode)}>엑셀 양식 다운로드</button></div><Issues items={issues}/><div className="dialog-actions"><button className="button secondary" type="button" onClick={close}>취소</button><button className="button primary" type="button" onClick={chooseFile}>엑셀 파일 선택</button></div></> : <><p className="muted"><strong>{setup.fileName}</strong>에서 사용할 열을 선택하세요.</p><div className="import-fields"><label>워크시트<select value={setup.sheetIndex} onChange={(event) => setSheet(Number(event.target.value))}>{setup.inspection.sheets.map((item) => <option key={item.index} value={item.index}>{item.name}</option>)}</select></label><label>머리글 행<select value={setup.headerRow} onChange={(event) => { if (setup !== undefined && sheet !== undefined) setSetup({ ...setup, headerRow: Number(event.target.value), mapping: defaultMapping(sheet, mode) }) }}>{sheet?.headerRows.map((row) => <option key={row} value={row}>{row}행</option>)}</select></label><ColumnSelect label="이름 열" value={setup.mapping.nameColumn} columns={columns} onChange={(nameColumn) => setSetup({ ...setup, mapping: { ...setup.mapping, nameColumn } })}/>{mode === 'organization-name' && <ColumnSelect label="소속 열" value={setup.mapping.organizationColumn ?? -1} columns={columns} onChange={(organizationColumn) => setSetup({ ...setup, mapping: { ...setup.mapping, organizationColumn } })}/>}</div><Issues items={issues}/><div className="dialog-actions"><button className="button secondary" type="button" onClick={chooseFile}>다른 파일 선택</button><button className="button primary" type="button" disabled={isImporting} onClick={() => void commit()}>{isImporting ? '불러오는 중…' : '명단 불러오기'}</button></div></>}
    <input ref={input} className="sr-only" type="file" accept=".xlsx,.xls" onChange={(event) => void readFile(event)}/>
  </dialog>
}
function defaultMapping(sheet: WorkbookSheet, mode: ImportMode): ColumnMapping { const name = sheet.columns.find((column) => column.header === '이름')?.index ?? sheet.columns[0]?.index ?? -1; const organization = sheet.columns.find((column) => column.header === '소속' || column.header === '기관')?.index ?? sheet.columns[1]?.index ?? -1; return mode === 'name' ? { nameColumn: name } : { nameColumn: name, organizationColumn: organization } }
function ColumnSelect({ label, value, columns, onChange }: { readonly label: string; readonly value: number; readonly columns: readonly { readonly index: number; readonly label: string; readonly header: string }[]; readonly onChange: (value: number) => void }) { return <label>{label}<select value={value} onChange={(event) => onChange(Number(event.target.value))}>{columns.map((column) => <option key={column.index} value={column.index}>{column.label} · {column.header}</option>)}</select></label> }
function Issues({ items }: { readonly items: readonly ImportIssue[] }) { return items.length === 0 ? null : <div className="import-issues" role="alert"><strong>명단을 불러오지 못했어요.</strong><ul>{items.map((item, index) => <li key={`${item.code}-${item.row ?? index}`}>{item.message}{item.row === undefined ? '' : ` (${item.row}행)`}</li>)}</ul></div> }
