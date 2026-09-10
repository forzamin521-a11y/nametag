import { describe, expect, it } from 'vitest'
import type { NametagRecord } from '../../src/lib/import-types'
import { paginateRecords, paginateTents } from '../../src/lib/pagination'

function record(index: number): NametagRecord {
  return {
    name: `이름 ${index + 1}`,
    sheet: '명단',
    row: index + 2,
  }
}

describe('paginateRecords', () => {
  it('returns no print pages when there are no records', () => {
    // Given
    const records: readonly NametagRecord[] = []

    // When
    const pages = paginateRecords(records)

    // Then
    expect(pages).toEqual([])
  })

  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [9, 3],
  ])('creates %s deterministic four-up pages for %s records', (count, expectedPages) => {
    // Given
    const records = Array.from({ length: count }, (_, index) => record(index))

    // When
    const pages = paginateRecords(records)

    // Then
    expect(pages).toHaveLength(expectedPages)
    expect(pages.flatMap((page) => page.slots.map((slot) => slot.record?.row))).toEqual([
      ...records.map((item) => item.row),
      ...Array.from({ length: expectedPages * 4 - count }, () => undefined),
    ])
  })

  it('places cards left-to-right and then top-to-bottom', () => {
    // Given
    const records = Array.from({ length: 5 }, (_, index) => record(index))

    // When
    const pages = paginateRecords(records)

    // Then
    expect(pages[0]?.slots.map(({ row, column }) => [row, column])).toEqual([
      [0, 0], [0, 1], [1, 0], [1, 1],
    ])
    expect(pages[1]?.slots.map((slot) => slot.record?.name)).toEqual([
      '이름 5', undefined, undefined, undefined,
    ])
  })
})

describe('paginateTents', () => {
  it('returns no pages when there are no records', () => {
    expect(paginateTents([])).toEqual([])
  })

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
  ])('creates one full A4 page per tent (%s records)', (count, expectedPages) => {
    // Given
    const records = Array.from({ length: count }, (_, index) => record(index))

    // When
    const pages = paginateTents(records)

    // Then: one record per page, no empty slots, order preserved.
    expect(pages).toHaveLength(expectedPages)
    expect(pages.every((page) => page.slots.length === 1)).toBe(true)
    expect(pages.flatMap((page) => page.slots.map((slot) => slot.record?.row))).toEqual(
      records.map((item) => item.row),
    )
  })
})
