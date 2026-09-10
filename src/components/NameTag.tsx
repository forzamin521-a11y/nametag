import { useLayoutEffect, useRef, useState } from 'react'
import { fitText, nameFontRange, organizationFontRange } from '../lib/fit-text'
import type { ImportMode, NametagRecord } from '../lib/import-types'

export type NameTagFit = {
  readonly record: NametagRecord
  readonly fits: boolean
}

type NameTagProps = {
  readonly eventName: string
  readonly mode: ImportMode
  readonly record: NametagRecord
  readonly brandLogo?: string
  readonly onFitChange?: (fit: NameTagFit) => void
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

export function NameTag({ eventName, mode, record, brandLogo, onFitChange }: NameTagProps) {
  const content = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState<FittedSizes>({
    nameSizePt: nameFontRange.maximumPt,
    ...(mode === 'organization-name' ? { organizationSizePt: organizationFontRange.maximumPt } : {}),
    fits: true,
  })
  const hasOrganization = mode === 'organization-name' && record.organization !== undefined

  useLayoutEffect(() => {
    const element = content.current
    if (element === null) {
      return
    }

    const next = fitText({
      name: nameFontRange,
      ...(hasOrganization ? { organization: organizationFontRange } : {}),
      fits: (candidate) => {
        element.style.setProperty('--nametag-name-size', `${candidate.nameSizePt}pt`)
        if (candidate.organizationSizePt !== undefined) {
          element.style.setProperty('--nametag-organization-size', `${candidate.organizationSizePt}pt`)
        }
        return element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight
      },
    })

    setSizes((current) => sameSizes(current, next) ? current : next)
    onFitChange?.({ record, fits: next.fits })
  }, [hasOrganization, mode, onFitChange, record, brandLogo])

  return <article
    aria-label={`${record.name} 명찰`}
    className={`nametag${sizes.fits ? '' : ' nametag--overflow'}`}
    data-row={record.row}
  >
    <span className="nametag-guide nametag-guide--top-left" aria-hidden="true" />
    <span className="nametag-guide nametag-guide--top-right" aria-hidden="true" />
    <span className="nametag-guide nametag-guide--bottom-left" aria-hidden="true" />
    <span className="nametag-guide nametag-guide--bottom-right" aria-hidden="true" />
    <div className="nametag__content" ref={content}>
      <div className="nametag__body">
        {eventName !== '' && <p className="nametag__event">{eventName}</p>}
        {hasOrganization && <p className="nametag__organization">{record.organization}</p>}
        <p className="nametag__name">{record.name}</p>
      </div>
      {brandLogo !== undefined && <div className="nametag__brand"><img src={brandLogo} alt="명찰 로고"/></div>}
    </div>
  </article>
}
