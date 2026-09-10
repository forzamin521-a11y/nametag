import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImportDialog } from './components/ImportDialog'
import { PrintPages } from './components/PrintPages'
import { TentPages } from './components/TentPages'
import { SignInSheet } from './components/SignInSheet'
import { RosterEditor } from './components/RosterEditor'
import type { NameTagFit } from './components/NameTag'
import { printAfterFontsReady } from './lib/print'
import type { ImportMode, NametagRecord, RosterEntry } from './lib/import-types'
import gyeonggiSportsLogo from '../bi.PNG'

const defaultEventName = '경기도체육회 행사'
const SIGNIN_ROWS_PER_PAGE = 22

type OutputFormat = 'nametag' | 'tent' | 'signin'

const formatSpec: Record<OutputFormat, { readonly size: string; readonly desc: string; readonly perSheet: string; readonly orientation: string }> = {
  nametag: { size: '95 × 123 mm', desc: '세로형 목걸이 명찰', perSheet: 'A4 · 한 장에 4개', orientation: 'A4 세로 · 실제 크기 100%' },
  tent: { size: 'A4 가로 · 1장에 1명', desc: '3단 접이 삼각 명패', perSheet: 'A4 가로 · 한 장에 1개', orientation: 'A4 가로 · 실제 크기 100%' },
  signin: { size: 'A4 세로', desc: '참석자 서명부', perSheet: 'A4 · 표 형식', orientation: 'A4 세로 · 실제 크기 100%' },
}

function fitKey(record: Pick<NametagRecord, 'sheet' | 'row'>): string {
  return `${record.sheet}:${record.row}`
}

export function App() {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [roster, setRoster] = useState<readonly RosterEntry[]>([])
  const [mode, setMode] = useState<ImportMode>('name')
  const [eventName, setEventName] = useState(defaultEventName)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('nametag')
  const [overflowRows, setOverflowRows] = useState<ReadonlySet<string>>(() => new Set())
  const [brandLogo, setBrandLogo] = useState<string>()
  const logoInput = useRef<HTMLInputElement>(null)

  const selectedEntries = useMemo(() => roster.filter((entry) => entry.selected), [roster])
  const selectedIds = useMemo(() => new Set(selectedEntries.map((entry) => entry.id)), [selectedEntries])
  const printableOverflow = useMemo(
    () => [...overflowRows].filter((key) => selectedIds.has(key)),
    [overflowRows, selectedIds],
  )

  // Tents print A4 landscape via a named @page; that page only applies when the document advertises the format.
  useEffect(() => {
    document.documentElement.dataset['printFormat'] = outputFormat
    return () => { delete document.documentElement.dataset['printFormat'] }
  }, [outputFormat])

  const handleFitChange = useCallback(({ record, fits }: NameTagFit) => {
    const key = fitKey(record)
    setOverflowRows((current) => {
      // A change is needed only when the fit result disagrees with the stored state.
      if (fits !== current.has(key)) {
        return current
      }
      const next = new Set(current)
      if (fits) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleImport = useCallback((records: readonly NametagRecord[], nextMode: ImportMode) => {
    setRoster(records.map((record) => ({ ...record, id: fitKey(record), selected: true })))
    setMode(nextMode)
    setOverflowRows(new Set())
  }, [])

  const handleUpdate = useCallback((id: string, field: 'name' | 'organization', value: string) => {
    setRoster((current) => current.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry))
  }, [])

  const handleToggle = useCallback((id: string, selected: boolean) => {
    setRoster((current) => current.map((entry) => entry.id === id ? { ...entry, selected } : entry))
  }, [])

  const handleToggleAll = useCallback((selected: boolean) => {
    setRoster((current) => current.map((entry) => ({ ...entry, selected })))
  }, [])

  const chooseFormat = useCallback((next: OutputFormat) => {
    // Fit results differ per layout, so clear stale overflow flags when the output changes.
    setOutputFormat(next)
    setOverflowRows(new Set())
  }, [])

  const spec = formatSpec[outputFormat]
  const overflowBlocks = outputFormat !== 'signin' && printableOverflow.length > 0
  const sheetCount = outputFormat === 'nametag'
    ? Math.ceil(selectedEntries.length / 4)
    : outputFormat === 'tent'
      ? selectedEntries.length
      : Math.ceil(selectedEntries.length / SIGNIN_ROWS_PER_PAGE)

  const cannotPrint = selectedEntries.length === 0 || isImporting || overflowBlocks
  const printHint = isImporting
    ? '명단을 불러오는 중이에요. 완료되면 인쇄할 수 있어요.'
    : overflowBlocks
      ? '선택한 항목 중 일부 글자가 영역을 벗어나요. 이름 또는 소속명을 줄여 주세요.'
      : roster.length === 0
        ? '명단을 불러오면 인쇄할 수 있어요.'
        : selectedEntries.length === 0
          ? '인쇄할 대상을 한 명 이상 선택해 주세요.'
          : '인쇄 창에서 실제 크기 100%를 선택해 주세요.'

  function openImport() {
    setIsImportOpen(true)
  }

  // Read a local PNG/JPG entirely in the browser as a data URL so it prints without any upload.
  function readLogo(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined || (file.type !== 'image/png' && file.type !== 'image/jpeg')) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') setBrandLogo(reader.result) }
    reader.readAsDataURL(file)
  }

  return <>
    <header className="app-header" data-print-controls><div className="header-inner">
      <a className="wordmark" href="./"><img className="wordmark-logo" src={gyeonggiSportsLogo} alt="경기도체육회"/><span className="wordmark-divider" aria-hidden="true"/>행사 명찰</a>
      <span className="local-note"><span aria-hidden="true" className="status-dot"/>내 컴퓨터에서 안전하게</span>
    </div></header>
    <main className="app-main">
      <div className="intro" data-print-controls><div><p className="eyebrow">행사 준비, 조금 더 간편하게</p><h1>명단 하나로, 인쇄물까지.</h1><p>엑셀 명단을 올리고, 명찰·삼각 명패·참석자 서명부를 A4로 인쇄하세요.</p></div><span className="format-label">{spec.size}<span>{spec.desc}</span></span></div>
      <div className="workspace">
        <aside className="settings-panel" aria-label="명찰 설정" data-print-controls>
          <section className="panel event-panel"><div className="section-heading"><span className="step">01</span><h2>행사 정보</h2></div><label className="event-field" htmlFor="event-name"><span>행사명</span><input id="event-name" value={eventName} maxLength={40} onChange={(event) => setEventName(event.target.value)} placeholder="예: 2026 경기도 체육대회"/></label><p className="file-hint">인쇄물 상단에 표시됩니다.</p>
            <div className="logo-field"><span className="logo-field__label">명찰 로고 <em>목걸이 명찰</em></span>
              {brandLogo === undefined
                ? <div className="logo-actions"><button className="button secondary" type="button" onClick={() => logoInput.current?.click()}>이미지 추가</button><button className="button secondary" type="button" onClick={() => setBrandLogo(gyeonggiSportsLogo)}>경기도체육회 BI 넣기</button></div>
                : <div className="logo-preview"><img src={brandLogo} alt="선택한 명찰 로고 미리보기"/><button className="text-button" type="button" onClick={() => setBrandLogo(undefined)}>제거</button></div>}
              <input ref={logoInput} className="sr-only" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={readLogo}/>
              <p className="file-hint">PNG · JPG 파일을 올리면 크기에 맞게 자동으로 들어가요. 가로로 긴 로고·투명 배경 PNG를 권장해요. (목걸이 명찰에만 표시)</p>
            </div></section>
          <section className="panel"><div className="section-heading"><span className="step">02</span><h2>명단 불러오기</h2></div><p className="muted">이름만 넣거나, 소속과 이름을 함께 넣을 수 있어요.</p><button className="button primary wide" onClick={openImport}>엑셀 일괄 업로드</button><p className="file-hint">.xlsx · .xls / 최대 10 MiB · 1,000명</p><div className="privacy-note">명단은 브라우저 안에서만 처리되며<br/>서버에 저장되지 않아요.</div></section>
          <section className="panel"><div className="section-heading"><span className="step">03</span><h2>출력 형식</h2></div><fieldset className="mode-options"><legend className="sr-only">인쇄할 출력물</legend>
            <label className="mode-option"><input type="radio" name="output-format" checked={outputFormat === 'nametag'} onChange={() => chooseFormat('nametag')}/><span><strong>목걸이 명찰</strong><small>세로형 명찰을 A4에 4개씩.</small></span></label>
            <label className="mode-option"><input type="radio" name="output-format" checked={outputFormat === 'tent'} onChange={() => chooseFormat('tent')}/><span><strong>삼각 명패</strong><small>3단 접이 탁상 명패를 A4에 1개씩.</small></span></label>
            <label className="mode-option"><input type="radio" name="output-format" checked={outputFormat === 'signin'} onChange={() => chooseFormat('signin')}/><span><strong>참석자 서명부</strong><small>이름·소속·서명란 표를 인쇄.</small></span></label>
          </fieldset></section>
          <section className="panel"><div className="section-heading"><span className="step">04</span><h2>인쇄 준비</h2></div><dl className="stats"><div><dt>인쇄 대상</dt><dd>{selectedEntries.length} <span>/ {roster.length}명</span></dd></div><div><dt>인쇄 용지</dt><dd>{sheetCount} <span>장</span></dd></div></dl><button className="button primary wide" disabled={cannotPrint} onClick={() => void printAfterFontsReady()}>인쇄하기</button><p className="file-hint" role={overflowBlocks ? 'alert' : undefined}>{printHint}</p><div className="print-guide"><strong>프린터 설정</strong><p>{spec.orientation}<br/>머리글과 바닥글 끄기</p></div></section>
        </aside>
        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="preview-heading" data-print-controls><h2 id="preview-title">인쇄 미리보기</h2><span>{spec.perSheet}</span></div>
          {roster.length > 0 && <RosterEditor entries={roster} mode={mode} overflowKeys={outputFormat === 'signin' ? new Set() : overflowRows} onUpdate={handleUpdate} onToggle={handleToggle} onToggleAll={handleToggleAll}/>}
          <div className="preview-canvas">{selectedEntries.length === 0
            ? <div className="empty-state" data-print-controls><div className="empty-badge" aria-hidden="true"><span/><i/><i/></div><h3>{roster.length === 0 ? '첫 번째 명단을 불러와 주세요' : '인쇄할 대상을 선택해 주세요'}</h3><p>{roster.length === 0 ? <>명단을 올리면 이곳에서<br/>인쇄물을 확인할 수 있어요.</> : <>위 명단에서 인쇄할 사람을<br/>한 명 이상 선택해 주세요.</>}</p>{roster.length === 0 && <button className="button secondary" onClick={openImport}>명단 불러오기</button>}</div>
            : outputFormat === 'nametag'
              ? <PrintPages eventName={eventName.trim()} mode={mode} records={selectedEntries} {...(brandLogo === undefined ? {} : { brandLogo })} onFitChange={handleFitChange}/>
              : outputFormat === 'tent'
                ? <TentPages eventName={eventName.trim()} mode={mode} records={selectedEntries} onFitChange={handleFitChange}/>
                : <SignInSheet eventName={eventName.trim()} mode={mode} records={selectedEntries}/>}</div>
          <p className="preview-caption" data-print-controls>{spec.desc} · 경기도체육회 행사</p>
        </section>
      </div>
      <footer className="app-footer" data-print-controls>엑셀 준비 → 명단 편집 → 인쇄. 필요한 만큼, 간편하게.<br/><span className="app-credit">만든 사람 · 박광민</span></footer>
    </main>
    <ImportDialog open={isImportOpen} onClose={() => setIsImportOpen(false)} onCommit={handleImport} onImportingChange={setIsImporting}/>
  </>
}
