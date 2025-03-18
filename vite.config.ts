import dts from 'vite-plugin-dts'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [dts({ rollupTypes: true })],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'jsonResponseStream',
      formats: ['es', 'cjs', 'umd', 'iife'],
      fileName: (format) => (format === 'cjs' ? `index.${format}.cjs` : `index.${format}.js`)
    }
  }
})
