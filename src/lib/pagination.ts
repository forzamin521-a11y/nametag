import type { NametagRecord } from './import-types'

export const CARDS_PER_PAGE = 4
export const CARD_COLUMNS = 2
export const TENTS_PER_PAGE = 1
export const TENT_COLUMNS = 1

export type CardSlot = {
  readonly index: number
  readonly row: number
  readonly column: number
  readonly record?: NametagRecord
}

export type NametagPage = {
  readonly index: number
  readonly slots: readonly CardSlot[]
}

function createSlot(index: number, columns: number, record: NametagRecord | undefined): CardSlot {
  return {
    index,
    row: Math.floor(index / columns),
    column: index % columns,
    ...(record === undefined ? {} : { record }),
  }
}

/** Groups roster rows into fixed pages of `perPage` slots without changing input order. */
function paginate(records: readonly NametagRecord[], perPage: number, columns: number): readonly NametagPage[] {
  const pageCount = Math.ceil(records.length / perPage)

  return Array.from({ length: pageCount }, (_, pageIndex) => {
    const firstRecordIndex = pageIndex * perPage
    const slots = Array.from({ length: perPage }, (_, slotIndex) =>
      createSlot(slotIndex, columns, records[firstRecordIndex + slotIndex]),
    )

    return { index: pageIndex, slots }
  })
}

/** Four-up A4 portrait pages for lanyard nametags. */
export function paginateRecords(records: readonly NametagRecord[]): readonly NametagPage[] {
  return paginate(records, CARDS_PER_PAGE, CARD_COLUMNS)
}

/** One A4 portrait page per folded triangular tent. */
export function paginateTents(records: readonly NametagRecord[]): readonly NametagPage[] {
  return paginate(records, TENTS_PER_PAGE, TENT_COLUMNS)
}
