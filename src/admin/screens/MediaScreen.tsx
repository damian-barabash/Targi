// Biblioteka mediów — jak w WordPressie: siatka zdjęć, wgrywanie, opis alt, usuwanie.
import { useState } from 'react'
import { STORAGE, db, fmtDate } from '../api'
import { fail, toast, useStore } from '../store'
import { BUILTIN, Uploader, deleteMedia, thumb, useMedia, type MediaRow } from '../media'
import { Btn, Card, Empty, Icon, Modal, PageHead, Spinner, Tabs, ask } from '../ui'

export default function MediaScreen() {
  const { rows, setRows } = useMedia()
  const site = useStore((s) => s.site)
  const role = useStore((s) => s.me!.role)
  const [tab, setTab] = useState<'lib' | 'site'>('lib')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<MediaRow | null>(null)
  const used = JSON.stringify(site)
  const list = (rows ?? []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  const total = (rows ?? []).reduce((s, r) => s + (r.bytes ?? 0), 0)

  return (
    <>
      <PageHead title="Media" desc="Zdjęcia i logotypy do użycia na stronie. Panel sam zmniejsza je do trzech rozmiarów i zapisuje w lekkim formacie WebP." />
      <Uploader onDone={(n) => setRows((r) => [...n, ...(r ?? [])])} />
      <div className="row row--between row--wrap">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'lib', label: 'Biblioteka', count: rows?.length }, { value: 'site', label: 'Zdjęcia strony', count: BUILTIN.length }]} />
        {tab === 'lib' && (
          <div className="row">
            <span className="muted-t">Zajęte miejsce: ok. {(total * 2.2 / 1e6).toFixed(1)} MB z 1000 MB</span>
            <label className="search">
              <Icon n="search" s={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj po nazwie…" />
            </label>
          </div>
        )}
      </div>
      <Card>
        {tab === 'site' ? (
          <div className="mgrid mgrid--lg">
            {BUILTIN.map((n) => (
              <div key={n} className="mitem mitem--static" title={n}>
                <img src={thumb(n)} alt={n} loading="lazy" />
                <span>{n}</span>
              </div>
            ))}
          </div>
        ) : !rows ? (
          <Spinner />
        ) : !list.length ? (
          <Empty icon="image" title="Biblioteka jest pusta">
            Przeciągnij zdjęcia na pole powyżej. Zdjęcia robocze strony są w zakładce „Zdjęcia strony”.
          </Empty>
        ) : (
          <div className="mgrid mgrid--lg">
            {list.map((r) => (
              <button key={r.id} className="mitem" onClick={() => setOpen(r)} title={r.name}>
                <img src={thumb(`media:${r.id}`)} alt={r.alt || r.name} loading="lazy" />
                <span>{r.name}</span>
                {used.includes(`media:${r.id}`) && <em>w użyciu</em>}
              </button>
            ))}
          </div>
        )}
      </Card>
      {open && (
        <Modal
          wide
          title={open.name}
          onClose={() => setOpen(null)}
          footer={
            <>
              {role !== 'reports' && (
                <Btn
                  kind="danger"
                  icon="trash"
                  onClick={async () => {
                    const inUse = used.includes(`media:${open.id}`)
                    if (!(await ask({ title: 'Usunąć zdjęcie z biblioteki?', text: inUse ? 'UWAGA: to zdjęcie jest używane na stronie — po usunięciu w tych miejscach zniknie.' : 'Zdjęcie nie jest nigdzie używane.', yes: 'Usuń', danger: true }))) return
                    try {
                      await deleteMedia(open.id)
                      setRows((rs) => rs?.filter((x) => x.id !== open.id) ?? null)
                      setOpen(null)
                    } catch (e) {
                      fail(e)
                    }
                  }}
                >
                  Usuń
                </Btn>
              )}
              <span className="grow" />
              <Btn kind="primary" onClick={() => setOpen(null)}>
                Gotowe
              </Btn>
            </>
          }
        >
          <div className="mdetail">
            <img src={`${STORAGE}/${open.id}-1600.webp`} alt={open.alt} />
            <div>
              <label className="ff__l">Nazwa</label>
              <input
                className="in"
                defaultValue={open.name}
                disabled={role === 'reports'}
                onBlur={async (e) => {
                  const name = e.target.value.trim()
                  if (!name || name === open.name) return
                  const { error } = await db.from('media').update({ name }).eq('id', open.id)
                  if (error) return fail(error)
                  setRows((rs) => rs?.map((x) => (x.id === open.id ? { ...x, name } : x)) ?? null)
                  toast('Zapisano nazwę')
                }}
              />
              <label className="ff__l mt">Opis dla czytników ekranu i Google (alt)</label>
              <input
                className="in"
                defaultValue={open.alt}
                disabled={role === 'reports'}
                placeholder="Co widać na zdjęciu?"
                onBlur={async (e) => {
                  const alt = e.target.value.trim()
                  if (alt === open.alt) return
                  const { error } = await db.from('media').update({ alt }).eq('id', open.id)
                  if (error) return fail(error)
                  setRows((rs) => rs?.map((x) => (x.id === open.id ? { ...x, alt } : x)) ?? null)
                  toast('Zapisano opis')
                }}
              />
              <dl className="dl mt">
                <dt>Wymiary</dt>
                <dd>
                  {open.width} × {open.height} px
                </dd>
                <dt>Dodano</dt>
                <dd>{fmtDate(open.created_at)}</dd>
                <dt>Użycie</dt>
                <dd>{used.includes(`media:${open.id}`) ? 'Na stronie (wersja robocza)' : 'Nieużywane'}</dd>
              </dl>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
