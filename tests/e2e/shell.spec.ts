import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const evidence = '.omo/evidence/task-1-shell'

for (const width of [390, 1440]) {
  test(`empty shell fits ${width}px and cannot print`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.getByRole('button', { name: '인쇄하기' })).toBeDisabled()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await mkdir(evidence, { recursive: true })
    await page.screenshot({ path: `${evidence}/empty-${width}.png`, fullPage: true })
  })
}

test('keyboard opens mode dialog and Escape returns focus', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: '엑셀 일괄 업로드' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await mkdir(evidence, { recursive: true })
  await page.screenshot({ path: `${evidence}/dialog.png`, fullPage: true })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('button', { name: '인쇄하기' })).toBeDisabled()
})

test('event title is editable before importing a roster', async ({ page }) => {
  await page.goto('/')
  const eventName = page.getByLabel('행사명')
  await expect(eventName).toHaveValue('경기도체육회 행사')
  await eventName.fill('2026 경기도 생활체육 한마당')
  await expect(eventName).toHaveValue('2026 경기도 생활체육 한마당')
})

test('cancel discards pending mode and preserves empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '엑셀 일괄 업로드' }).click()
  await page.getByRole('radio', { name: '소속 + 이름' }).check()
  await page.getByRole('button', { name: '취소', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: '인쇄하기' })).toBeDisabled()
  await page.getByRole('button', { name: '엑셀 일괄 업로드' }).click()
  await expect(page.getByRole('radio', { name: '소속 + 이름' })).toBeChecked()
})
