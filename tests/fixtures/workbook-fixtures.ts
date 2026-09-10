import * as XLSX from 'xlsx'

export type FixtureRow = readonly (string | number | null)[]

export function workbookBytes(rows: readonly FixtureRow[], bookType: XLSX.BookType = 'xlsx'): ArrayBuffer {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows.map((row) => [...row])), '명단')
  return XLSX.write(workbook, { type: 'array', bookType })
}

export function multiSheetBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), '빈 시트')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['기관', '이름'], ['  한국 학교  ', '  김민서  '], ['오픈AI', 'Alex Kim']]), '참가자')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

export function hostileExtentBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([['이름'], ['안전']])
  sheet['!ref'] = 'A1:CV10001'
  XLSX.utils.book_append_sheet(workbook, sheet, '큰 시트')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

export function formulaAndErrorBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([['이름'], ['정상']])
  sheet['A3'] = { t: 'n', v: 2, f: '1+1', w: '2' }
  sheet['A4'] = { t: 'e', v: 7, w: '#DIV/0!' }
  sheet['!ref'] = 'A1:A4'
  XLSX.utils.book_append_sheet(workbook, sheet, '명단')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}
