// Lista stron (jak w WordPressie) + tworzenie nowej strony.
import { useState } from 'react'
import type { PageDoc } from '../../content/types'
import { BLOCK_DEFS, newBlock, slug } from '../schema'
import { canEdit, mutate, toast, useStore } from '../store'
import { Badge, Btn, Card, Icon, Modal, PageHead, ask } from '../ui'
import { go } from '../entry'

export const RESERVED = ['admin', 'en', 'm', 'img', 'assets', 'strefy', 'zones', '404']

export function slugError(pages: PageDoc[], id: string, pl: string, en: string): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pl) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(en)) return 'Adres może zawierać tylko małe litery, cyfry i myślniki.'
  if (RESERVED.includes(pl) || RESERVED.includes(en)) return 'Ten adres jest zarezerwowany.'
  if (pages.some((p) => p.id !== id && (p.slug.pl === pl || p.slug.en === en))) return 'Inna strona ma już taki adres.'
  return ''
}

export default function PagesList() {
  const pages = useStore((s) => s.site.pages)
  const dirty = useStore((s) => s.dirty)
  const editable = canEdit('pages')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const sl = slug(title)
  const err = title ? slugError(pages, '', sl, sl) : ''

  function create() {
    const id = `p${Date.now().toString(36)}`
    const hero = newBlock('pageHero')
    hero.props.title = { pl: title, en: '' }
    const text = newBlock('text')
    text.props = { title: { pl: '', en: '' }, body: { pl: 'Treść strony…', en: '' } }
    const page: PageDoc = { id, slug: { pl: sl, en: sl }, title: { pl: title, en: title }, seo: { title: { pl: title, en: '' }, description: { pl: '', en: '' } }, order: Math.max(0, ...pages.map((p) => p.order)) + 1, blocks: [hero, text] }
    mutate((s) => ({ ...s, pages: [...s.pages, page] }), [`page:${id}`])
    setCreating(false)
    setTitle('')
    go(`edit/${id}`)
  }

  return (
    <>
      <PageHead title="Strony" desc="Każdą stronę składasz z gotowych bloków w edytorze wizualnym. Strony systemowe mają stały adres.">
        {editable && (
          <Btn kind="primary" icon="plus" onClick={() => setCreating(true)}>
            Dodaj stronę
          </Btn>
        )}
      </PageHead>
      <Card pad={false}>
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>Strona</th>
                <th>Adres</th>
                <th style={{ width: 90 }}>Bloki</th>
                <th style={{ width: 130 }}>Rodzaj</th>
                <th style={{ width: 190 }} />
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => go(`edit/${p.id}`)}>
                  <td className="strong">
                    {p.title.pl}
                    {dirty.includes(`page:${p.id}`) && <Badge tone="amber">niezapisana</Badge>}
                  </td>
                  <td className="mono">/{p.slug.pl}</td>
                  <td>{p.blocks.length}</td>
                  <td>{p.system ? <Badge>Systemowa</Badge> : <Badge tone="gold">Własna</Badge>}</td>
                  <td className="tbl__acts" onClick={(e) => e.stopPropagation()}>
                    <Btn small icon="edit" onClick={() => go(`edit/${p.id}`)}>
                      Edytuj
                    </Btn>
                    {editable && !p.system && (
                      <>
                        <Btn
                          small
                          kind="plain"
                          icon="copy"
                          title="Duplikuj stronę"
                          onClick={() => {
                            const id = `p${Date.now().toString(36)}`
                            const copy: PageDoc = { ...structuredClone(p), id, slug: { pl: `${p.slug.pl}-kopia`, en: `${p.slug.en}-copy` }, title: { pl: `${p.title.pl} (kopia)`, en: `${p.title.en} (copy)` }, order: Math.max(...pages.map((x) => x.order)) + 1 }
                            mutate((s) => ({ ...s, pages: [...s.pages, copy] }), [`page:${id}`])
                            toast('Skopiowano stronę')
                          }}
                        />
                        <Btn
                          small
                          kind="plain"
                          icon="trash"
                          title="Usuń stronę"
                          onClick={async () =>
                            (await ask({ title: `Usunąć stronę „${p.title.pl}”?`, text: 'Linki do tej strony w menu i przyciskach przestaną działać. Strona zniknie po zapisaniu i publikacji.', yes: 'Usuń stronę', danger: true })) &&
                            mutate((s) => ({ ...s, pages: s.pages.filter((x) => x.id !== p.id) }), [`page:${p.id}`])
                          }
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="hint">
        <Icon n="info" s={15} /> Podstrony stref i wpisów tworzą się same z sekcji „Strefy” i „Aktualności”. Dostępnych bloków: {Object.keys(BLOCK_DEFS).length}.
      </p>
      {creating && (
        <Modal
          title="Nowa strona"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Btn onClick={() => setCreating(false)}>Anuluj</Btn>
              <Btn kind="primary" disabled={!title.trim() || !!err} onClick={create}>
                Utwórz i otwórz edytor
              </Btn>
            </>
          }
        >
          <label className="ff__l">Tytuł strony</label>
          <input className="in" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="np. Hotele partnerskie" />
          {title && <p className="ff__h">Adres: /{sl || '…'} — można go zmienić w ustawieniach strony w edytorze.</p>}
          {err && <p className="login__err">{err}</p>}
        </Modal>
      )}
    </>
  )
}
