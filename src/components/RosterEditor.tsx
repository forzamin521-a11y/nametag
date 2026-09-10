import type { ImportMode } from '../lib/import-types'
import type { RosterEntry } from '../lib/import-types'

type RosterEditorProps = {
  readonly entries: readonly RosterEntry[]
  readonly mode: ImportMode
  readonly overflowKeys: ReadonlySet<string>
  readonly onUpdate: (id: string, field: 'name' | 'organization', value: string) => void
  readonly onToggle: (id: string, selected: boolean) => void
  readonly onToggleAll: (selected: boolean) => void
}

/** Inline roster table: edit names/organisations and pick who gets printed. Hidden from print output. */
export function RosterEditor({ entries, mode, overflowKeys, onUpdate, onToggle, onToggleAll }: RosterEditorProps) {
  const hasOrganization = mode === 'organization-name'
  const selectedCount = entries.reduce((total, entry) => total + (entry.selected ? 1 : 0), 0)
  const allSelected = selectedCount === entries.length
  const noneSelected = selectedCount === 0

  return <section className="roster-editor" data-print-controls aria-label="명단 편집">
    <div className="roster-editor__bar">
      <h3>명단 편집</h3>
      <div className="roster-editor__actions">
        <span className="roster-editor__count">{selectedCount} / {entries.length} 선택</span>
        <button className="text-button" type="button" onClick={() => onToggleAll(true)} disabled={allSelected}>전체 선택</button>
        <button className="text-button" type="button" onClick={() => onToggleAll(false)} disabled={noneSelected}>전체 해제</button>
      </div>
    </div>
    <div className="roster-editor__scroll">
      <table className="roster-table">
        <thead>
          <tr>
            <th className="roster-table__pick" scope="col">
              <input
                type="checkbox"
                aria-label="전체 인쇄 선택"
                checked={allSelected}
                ref={(node) => { if (node) node.indeterminate = !allSelected && !noneSelected }}
                onChange={(event) => onToggleAll(event.target.checked)}
              />
            </th>
            {hasOrganization && <th scope="col">소속</th>}
            <th scope="col">이름</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const overflow = overflowKeys.has(entry.id)
            return <tr key={entry.id} className={`${entry.selected ? '' : 'roster-row--off'}${overflow ? ' roster-row--overflow' : ''}`}>
              <td className="roster-table__pick">
                <input
                  type="checkbox"
                  aria-label={`${entry.name} 인쇄`}
                  checked={entry.selected}
                  onChange={(event) => onToggle(entry.id, event.target.checked)}
                />
              </td>
              {hasOrganization && <td>
                <input
                  className="roster-input"
                  value={entry.organization ?? ''}
                  maxLength={60}
                  placeholder="소속"
                  onChange={(event) => onUpdate(entry.id, 'organization', event.target.value)}
                />
              </td>}
              <td>
                <input
                  className="roster-input"
                  value={entry.name}
                  maxLength={40}
                  placeholder="이름"
                  onChange={(event) => onUpdate(entry.id, 'name', event.target.value)}
                />
                {overflow && <span className="roster-row__flag" role="img" aria-label="영역을 벗어남">넘침</span>}
              </td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  </section>
}
