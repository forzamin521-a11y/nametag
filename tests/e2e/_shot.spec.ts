import { test, type Page } from '@playwright/test'
import * as XLSX from 'xlsx'

const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const dir = 'C:/Temp/claude/E--etc-AC-ai-nametag/ef005947-d222-47d8-b456-68a6dc8f4775/scratchpad'

function orgWorkbook(): Buffer {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['소속', '이름'],
    ['경기도체육회 사무처', '김하늘'],
    ['경기도장애인체육회 생활체육지원부', '이바다현서'],
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, '참가자')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

async function importOrg(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '엑셀 일괄 업로드' }).click()
  await page.getByLabel('소속 + 이름').check()
  await page.locator('.import-dialog input[type="file"]').setInputFiles({ name: 'r.xlsx', mimeType: xlsxMime, buffer: orgWorkbook() })
  await page.getByRole('dialog').getByRole('button', { name: '명단 불러오기' }).click()
  await page.getByLabel('김하늘 명찰').waitFor()
}

test('capture triangular tent preview (landscape)', async ({ page }) => {
  await importOrg(page)
  await page.getByRole('radio', { name: /삼각 명패/ }).check()
  await page.getByLabel('김하늘 명패').first().waitFor()
  await page.locator('.print-page--tent').first().screenshot({ path: `${dir}/preview-tent-short.png` })
  await page.locator('.print-page--tent').nth(1).screenshot({ path: `${dir}/preview-tent-long.png` })
  const overflow = await page.locator('.name-tent--overflow').count()
  const hint = await page.locator('.print-guide').first().textContent()
  console.log('OVERFLOW_COUNT', overflow, 'PRINT_ENABLED', await page.getByRole('button', { name: '인쇄하기' }).isEnabled(), 'HINT', hint)
})
