import { useEffect, useRef } from 'react'
import { NameTent } from './NameTent'
import { paginateTents } from '../lib/pagination'
import type { ImportMode, NametagRecord } from '../lib/import-types'
import type { NameTentFit } from './NameTent'

type TentPagesProps = {
  readonly eventName: string
  readonly mode: ImportMode
  readonly records: readonly NametagRecord[]
  readonly onFitChange?: (fit: NameTentFit) => void
}

/**
 * Renders one A4 landscape page per folded tent (two 75mm name faces + a 60mm base).
 * Pages lay out at physical size so text fitting is measured against real millimetres; the
 * screen preview is shrunk with a CSS transform only, which leaves layout metrics untouched.
 */
export function TentPages({ eventName, mode, records, onFitChange }: TentPagesProps) {
  const pages = paginateTents(records)
  const container = useRef<HTMLDivElement>(null)

  // Fit each physically-sized page into the available preview width using a visual-only scale.
  useEffect(() => {
    const root = container.current
    if (root === null) {
      return
    }

    const applyScale = () => {
      const page = root.querySelector<HTMLElement>('.print-page--tent')
      if (page === null) {
        return
      }
      // offsetWidth reports the untransformed physical width (297mm in px) regardless of scale.
      const physicalWidth = page.offsetWidth
      if (physicalWidth === 0) {
        return
      }
      const scale = Math.min(1, root.clientWidth / physicalWidth)
      root.style.setProperty('--tent-scale', `${scale}`)
    }

    applyScale()
    const observer = new ResizeObserver(applyScale)
    observer.observe(root)
    return () => observer.disconnect()
  }, [pages.length])

  return <div className="tent-pages" ref={container} aria-label="인쇄할 삼각 명패 미리보기">
    {pages.map((page) => <div className="tent-frame" key={page.index}>
      <section
        aria-label={`${page.index + 1}번째 인쇄 용지`}
        className="print-page print-page--tent"
        data-page-index={page.index}
      >
        {page.slots.map((slot) => slot.record === undefined
          ? <div aria-hidden="true" className="print-page__empty-slot" key={slot.index} />
          : <NameTent eventName={eventName} key={slot.index} mode={mode} {...(onFitChange === undefined ? {} : { onFitChange })} record={slot.record} />,
        )}
      </section>
    </div>)}
  </div>
}
