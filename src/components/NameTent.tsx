import { useLayoutEffect, useRef, useState } from 'react'
import { fitText, tentNameFontRange, tentOrganizationFontRange } from '../lib/fit-text'
import type { ImportMode, NametagRecord } from '../lib/import-types'

export type NameTentFit = {
  readonly record: NametagRecord
  readonly fits: boolean
}

type NameTentProps = {
  readonly eventName: string
  readonly mode: ImportMode
  readonly record: NametagRecord
  readonly onFitChange?: (fit: NameTentFit) => void
}

type FittedSizes = {
  readonly nameSizePt: number
  readonly organizationSizePt?: number
  readonly fits: boolean
}

function sameSizes(left: FittedSizes, right: FittedSizes): boolean {
  return left.nameSizePt === right.nameSizePt
    && left.organizationSizePt === right.organizationSizePt
    && left.fits === right.fits
}

function TentFace({ eventName, mode, record, rotated, contentRef }: {
  readonly eventName: string
  readonly mode: ImportMode
  readonly record: NametagRecord
  readonly rotated?: boolean
  readonly contentRef?: React.Ref<HTMLDivElement>
}) {
  const hasOrganization = mode === 'organization-name' && record.organization !== undefined
  return <div className={`name-tent__face${rotated ? ' name-tent__face--rotated' : ''}`} aria-hidden={rotated || undefined}>
    <div className="name-tent__content" ref={contentRef}>
      {eventName !== '' && <p className="name-tent__event">{eventName}</p>}
      {hasOrganization && <p className="name-tent__organization">{record.organization}</p>}
      <p className="name-tent__name">{record.name}</p>
    </div>
  </div>
}

/**
 * A triangular table tent folded from one A4 sheet in thirds. The name prints on two of the
 * three faces — the top face rotated 180° — so both sides read upright when the prism stands;
 * the bottom third is the base.
 */
export function NameTent({ eventName, mode, record, onFitChange }: NameTentProps) {
  const root = useRef<HTMLElement>(null)
  const measured = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState<FittedSizes>({
    nameSizePt: tentNameFontRange.maximumPt,
    ...(mode === 'organization-name' ? { organizationSizePt: tentOrganizationFontRange.maximumPt } : {}),
    fits: true,
  })
  const hasOrganization = mode === 'organization-name' && record.organization !== undefined

  useLayoutEffect(() => {
    const rootElement = root.current
    const content = measured.current
    if (rootElement === null || content === null) {
      return
    }

    // Sizes live on the tent root so both faces share them; measurement reads one face's content box.
    const next = fitText({
      name: tentNameFontRange,
      ...(hasOrganization ? { organization: tentOrganizationFontRange } : {}),
      fits: (candidate) => {
        rootElement.style.setProperty('--tent-name-size', `${candidate.nameSizePt}pt`)
        if (candidate.organizationSizePt !== undefined) {
          rootElement.style.setProperty('--tent-organization-size', `${candidate.organizationSizePt}pt`)
        }
        return content.scrollWidth <= content.clientWidth && content.scrollHeight <= content.clientHeight
      },
    })

    setSizes((current) => sameSizes(current, next) ? current : next)
    onFitChange?.({ record, fits: next.fits })
  }, [hasOrganization, mode, onFitChange, record])

  return <article
    ref={root}
    aria-label={`${record.name} 명패`}
    className={`name-tent${sizes.fits ? '' : ' name-tent--overflow'}`}
    data-row={record.row}
  >
    <TentFace eventName={eventName} mode={mode} record={record} rotated />
    <TentFace eventName={eventName} mode={mode} record={record} contentRef={measured} />
    <div className="name-tent__base" aria-hidden="true"><span>접는 선을 따라 두 번 접어 세우세요</span></div>
  </article>
}
