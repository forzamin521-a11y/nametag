import { expect, test, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'

const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function nameWorkbook(): Buffer {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([['이름'], ['가람'], ['나래'], ['다온']])
  XLSX.utils.book_append_sheet(workbook, sheet, '참가자')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function importNames(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '엑셀 일괄 업로드' }).click()
  await page.locator('.import-dialog input[type="file"]').setInputFiles({ name: 'roster.xlsx', mimeType: xlsxMime, buffer: nameWorkbook() })
  await page.getByRole('dialog').getByRole('button', { name: '명단 불러오기' }).click()
  await expect(page.getByLabel('가람 명찰')).toBeVisible()
}

test('triangular tent prints one name per A4 landscape sheet on two folded faces', async ({ page }) => {
  // Given: an imported roster shown as lanyard nametags.
  await importNames(page)

  // When: the user switches the output format to the table tent.
  await page.getByRole('radio', { name: /삼각 명패/ }).check()

  // Then: the tent renders the name on two of its three faces (base is blank) without an overflow warning.
  const tent = page.getByLabel('가람 명패')
  await expect(tent).toBeVisible()
  await expect(tent.getByText('가람', { exact: true })).toHaveCount(2)
  await expect(page.locator('.name-tent--overflow')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '인쇄하기' })).toBeEnabled()

  // And: one tent fills one A4 landscape page (wider than it is tall).
  await page.emulateMedia({ media: 'print' })
  const size = await page.locator('.print-page--tent').first().evaluate((el) => {
    const style = getComputedStyle(el)
    return { width: parseFloat(style.width), height: parseFloat(style.height) }
  })
  expect(size.width).toBeGreaterThan(size.height)
  // A4 landscape width (297mm) is ~1122px at 96dpi; portrait would be ~794px.
  expect(size.width).toBeGreaterThan(1000)
})

test('sign-in sheet lists attendees with a repeating printed header', async ({ page }) => {
  // Given: an imported roster.
  await importNames(page)

  // When: the user switches to the attendance sign-in sheet.
  await page.getByRole('radio', { name: /참석자 서명부/ }).check()

  // Then: the sheet shows a signature column and the attendees in order.
  const sheet = page.locator('.sign-in-table')
  await expect(sheet.getByRole('columnheader', { name: '서명' })).toBeVisible()
  await expect(sheet.getByRole('cell', { name: '가람', exact: true })).toBeVisible()

  // And: the table header repeats on every printed page.
  await page.emulateMedia({ media: 'print' })
  const headerDisplay = await page.locator('.sign-in-table thead').evaluate((el) => getComputedStyle(el).display)
  expect(headerDisplay).toBe('table-header-group')
})
