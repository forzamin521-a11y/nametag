import { NameTag } from './NameTag'
import { paginateRecords } from '../lib/pagination'
import type { ImportMode, NametagRecord } from '../lib/import-types'
import type { NameTagFit } from './NameTag'

type PrintPagesProps = {
  readonly eventName: string
  readonly mode: ImportMode
  readonly records: readonly NametagRecord[]
  readonly brandLogo?: string
  readonly onFitChange?: (fit: NameTagFit) => void
}

/** Renders A4 page boxes for preview and print; empty final slots deliberately stay empty. */
export function PrintPages({ eventName, mode, records, brandLogo, onFitChange }: PrintPagesProps) {
  const pages = paginateRecords(records)

  return <div className="print-pages" aria-label="인쇄할 명찰 미리보기">
    {pages.map((page) => <section
      aria-label={`${page.index + 1}번째 인쇄 용지`}
      className="print-page"
      data-page-index={page.index}
      key={page.index}
    >
      {page.slots.map((slot) => slot.record === undefined
        ? <div aria-hidden="true" className="print-page__empty-slot" key={slot.index} />
        : <NameTag eventName={eventName} key={slot.index} mode={mode} {...(brandLogo === undefined ? {} : { brandLogo })} {...(onFitChange === undefined ? {} : { onFitChange })} record={slot.record} />,
      )}
    </section>)}
  </div>
}
