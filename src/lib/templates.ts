import * as XLSX from 'xlsx'
import type { ImportMode } from './import-types'

export function downloadTemplate(mode: ImportMode): void {
  const rows = mode === 'name' ? [['이름'], ['김명찰'], ['이하늘']] : [['소속', '이름'], ['명찰협회', '김명찰'], ['행사운영팀', '이하늘']]
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet['!cols'] = (rows[0] ?? []).map(() => ({ wch: 18 }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '명단')
  const blob = new Blob([XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = mode === 'name' ? '명찰_이름만_양식.xlsx' : '명찰_소속_이름_양식.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
