import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'

function workbook(rows: readonly (readonly string[])[]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows.map((row) => [...row]))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, '참가자')
  return XLSX.write(book, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

async function importOrganizationRoster(page: import('@playwright/test').Page, rows: readonly (readonly string[])[]): Promise<void> {
  await page.getByRole('button', { name: '엑셀 일괄 업로드' }).click()
  await page.getByLabel('소속 + 이름').check()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '엑셀 파일 선택' }).click()
  await (await chooser).setFiles({ name: 'participants.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: workbook(rows) })
  await page.getByRole('dialog').getByRole('button', { name: '명단 불러오기' }).click()
}

test('imports five organization badges and preserves them after invalid replacement or cancellation', async ({ page }) => {
  await page.goto('/')
  await importOrganizationRoster(page, [
    ['기관', '이름'],
    ['운영팀', '김하늘'],
    ['운영팀', '이바다'],
    ['참가팀', '박나래'],
    ['참가팀', '최별'],
    ['지원팀', '한빛'],
  ])

  await expect(page.getByLabel('김하늘 명찰')).toBeVisible()
  await expect(page.locator('.stats dd').first()).toContainText('5')
  await expect(page.locator('.stats dd').nth(1)).toContainText('2')

  await importOrganizationRoster(page, [
    ['기관', '이름'],
    ['운영팀', '김하늘'],
    ['운영팀', ''],
  ])
  await expect(page.getByRole('alert')).toContainText('명단을 불러오지 못했어요')
  await expect(page.locator('.stats dd').first()).toContainText('5')

  await page.keyboard.press('Escape')
  await expect(page.locator('.import-dialog')).not.toBeVisible()
  await expect(page.locator('.stats dd').first()).toContainText('5')
})
