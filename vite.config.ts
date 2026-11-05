import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE_PATH: "/" for a custom domain, "/<repo>/" for github.io/<repo>
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  ssgOptions: {
    entry: 'src/main.tsx',
    dirStyle: 'nested',
    script: 'async',
    formatting: 'none',
    beastiesOptions: { preload: 'swap', reduceInlineStyles: false },
  },
})
