import type { ImportMode, NametagRecord } from '../lib/import-types'

type SignInSheetProps = {
  readonly eventName: string
  readonly mode: ImportMode
  readonly records: readonly NametagRecord[]
}

/**
 * A printable attendance sign-in sheet. A single table paginates through the browser's
 * print engine: the header repeats on every page and rows never split across a page break.
 */
export function SignInSheet({ eventName, mode, records }: SignInSheetProps) {
  const title = eventName === '' ? '참석자 서명부' : `${eventName} 참석자 서명부`
  const showOrganization = mode === 'organization-name'

  return <div className="sign-in-sheet" aria-label="참석자 서명부 미리보기">
    <div className="sign-in-page">
      <header className="sign-in-head">
        <h3>{title}</h3>
        <p className="sign-in-meta">일시 : ______________________　　장소 : ______________________</p>
      </header>
      <table className="sign-in-table">
        <thead>
          <tr>
            <th className="sign-in-table__no" scope="col">번호</th>
            {showOrganization && <th className="sign-in-table__org" scope="col">소속</th>}
            <th className="sign-in-table__name" scope="col">이름</th>
            <th className="sign-in-table__sign" scope="col">서명</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => <tr key={`${record.sheet}:${record.row}`}>
            <td className="sign-in-table__no">{index + 1}</td>
            {showOrganization && <td className="sign-in-table__org">{record.organization ?? ''}</td>}
            <td className="sign-in-table__name">{record.name}</td>
            <td className="sign-in-table__sign" />
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>
}
