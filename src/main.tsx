import { ViteReactSSG } from 'vite-react-ssg'
import '@fontsource/gloock/400.css'
import '@fontsource-variable/manrope/index.css'
import './styles/global.css'
import { routes } from './routes'

export const createRoot = ViteReactSSG({
  routes,
  basename: import.meta.env.BASE_URL,
})
