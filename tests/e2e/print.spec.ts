import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'

function workbookBytes(): Buffer {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['이름'],
    ['가람'],
    ['나래'],
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, '참가자')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

test('prints the imported card preview after fonts are ready', async ({ page }) => {
  // Given: a workbook is ready to import and printing is observed at the browser boundary.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'print', {
      configurable: true,
      value: () => { document.documentElement.dataset['printCalled'] = 'true' },
    })
  })
  await page.goto('/')

  // When: the roster is imported and the user chooses the native print action.
  await page.getByRole('button', { name: '엑셀 일괄 업로드' }).click()
  await page.locator('.import-dialog input[type="file"]').setInputFiles({
    name: 'participants.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: workbookBytes(),
  })
  await page.getByRole('dialog').getByRole('button', { name: '명단 불러오기' }).click()
  await expect(page.getByLabel('가람 명찰')).toBeVisible()
  await expect(page.getByLabel('가람 명찰').getByText('경기도체육회 행사')).toBeVisible()
  // The card carries no logo until one is chosen; the 경기도체육회 BI button restores the bundled mark.
  await expect(page.locator('.nametag__brand img')).toHaveCount(0)
  await page.getByRole('button', { name: '경기도체육회 BI 넣기' }).click()
  await expect(page.locator('.nametag__brand img')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '인쇄하기' })).toBeEnabled()
  await page.screenshot({ path: '.omo/evidence/brand-qa/imported-card.png', fullPage: true })
  await page.getByRole('button', { name: '인쇄하기' }).click()

  // Then: the browser print dialog is requested only after the actual card preview exists.
  await expect.poll(() => page.locator('html').getAttribute('data-print-called')).toBe('true')
})

test('excludes controls from the print document', async ({ page }) => {
  // Given: the app is rendered for printing.
  await page.goto('/')

  // When: print media styles are applied.
  await page.emulateMedia({ media: 'print' })

  // Then: non-print interface controls do not take space in the print output.
  await expect(page.locator('[data-print-controls]').first()).toBeHidden()
})
