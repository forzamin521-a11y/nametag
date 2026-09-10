import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base is '/nametag/' for the built GitHub Pages project site, '/' for local dev/preview.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/nametag/' : '/',
  plugins: [react()],
  test: { include: ['tests/unit/**/*.test.ts'] },
}))
