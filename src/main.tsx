import { ViteReactSSG } from 'vite-react-ssg'
import '@fontsource-variable/instrument-sans/index.css'
import '@fontsource-variable/newsreader/opsz.css'
import '@fontsource-variable/newsreader/opsz-italic.css'
import './styles/global.css'
import { routes } from './routes'

export const createRoot = ViteReactSSG({
  routes,
  basename: import.meta.env.BASE_URL,
})
