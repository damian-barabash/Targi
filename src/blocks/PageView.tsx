import { S } from '../content/site'
import { Seo, useLocale } from '../components/ui'
import { BLOCKS } from './blocks'
import { useEdit } from './edit'

/** Strona złożona z bloków. W panelu każdy blok dostaje ramkę edycji (ed.wrap). */
export default function PageView({ id }: { id: string }) {
  const l = useLocale()
  const ed = useEdit()
  const idx = S.pages.findIndex((p) => p.id === id)
  const page = S.pages[idx]
  if (!page) return null
  return (
    <>
      <Seo title={page.seo?.title?.[l] || page.title[l]} description={page.seo?.description?.[l] ?? ''} image={page.seo?.image} />
      {page.blocks.map((b, i) => {
        const C = BLOCKS[b.type]
        if (!C || (b.hidden && !ed)) return null
        const el = <C key={b.id} at={`pages.${idx}.blocks.${i}.props`} p={b.props ?? {}} />
        return ed?.wrap ? ed.wrap(b, i, el) : el
      })}
    </>
  )
}
