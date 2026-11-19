// Uniwersalny ekran sekcji danych: tabela pozycji + formularz w panelu bocznym, albo jeden formularz.
import { useState } from 'react'
import { setIn } from '../../lib/path'
import { COLLECTIONS } from '../schema'
import { canEdit, mutate, translatePaths, untranslated, useStore } from '../store'
import { FieldForm } from '../fields'
import { thumb } from '../media'
import { Badge, Btn, Card, Empty, Icon, Modal, PageHead, ask } from '../ui'
import { go, subTabs } from '../entry'
import SeoAssistant from '../seo/SeoAssistant'

export function SubTabs({ route }: { route: string }) {
  const tabs = subTabs(route)
  if (!tabs) return null
  return (
    <div className="tabs-a tabs-a--page">
      {tabs.map((x) => (
        <a key={x.to} href={`#/${x.to}`} className={x.to === route ? 'on' : ''}>
          {x.label}
        </a>
      ))}
    </div>
  )
}

export function TranslateBtn({ root, base }: { root: unknown; base: string }) {
  const [busy, setBusy] = useState(false)
  const todo = untranslated(root, base)
  return (
    <Btn
      icon="translate"
      busy={busy}
      title="Automatycznie przetłumacz na angielski teksty bez tłumaczenia lub oznaczone do sprawdzenia"
      onClick={async () => {
        setBusy(true)
        await translatePaths(todo)
        setBusy(false)
      }}
    >
      Przetłumacz brakujące EN{todo.length ? ` (${todo.length})` : ''}
    </Btn>
  )
}

export default function CollectionScreen({ id, index }: { id: string; index?: string }) {
  const def = COLLECTIONS[id]
  const data = useStore((s) => (s.site as any)[id])
  const editable = canEdit(id)
  const [q, setQ] = useState('')
  const [drag, setDrag] = useState<number | null>(null)
  const open = index != null && /^\d+$/.test(index) ? Number(index) : null
  const items: any[] = Array.isArray(data) ? data : []
  const write = (next: any[]) => mutate((s) => setIn(s, id, next), [id])
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return
    const next = [...items]
    next.splice(to, 0, next.splice(from, 1)[0])
    write(next)
  }
  const head = (
    <>
      <PageHead title={def.title} desc={def.desc}>
        {editable && <TranslateBtn root={data} base={id} />}
        {editable && def.kind === 'list' && (
          <Btn
            kind="primary"
            icon="plus"
            onClick={() => {
              const item = def.make!()
              write(id === 'posts' ? [item, ...items] : [...items, item])
              go(`c/${id}/${id === 'posts' ? 0 : items.length}`)
            }}
          >
            Dodaj {def.one}
          </Btn>
        )}
      </PageHead>
      <SubTabs route={`c/${id}`} />
      {!editable && (
        <p className="notice">
          <Icon n="eye" /> Twoja rola pozwala tylko przeglądać tę sekcję.
        </p>
      )}
    </>
  )

  if (def.kind === 'single')
    return (
      <>
        {head}
        <Card className="narrow">
          <fieldset disabled={!editable} className="plain">
            <FieldForm fields={def.fields} base={id} />
          </fieldset>
        </Card>
      </>
    )

  const shown = items.map((x, i) => ({ x, i })).filter(({ x }) => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      {head}
      <Card pad={false}>
        {items.length > 8 && (
          <div className="tbar">
            <label className="search">
              <Icon n="search" s={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj…" />
            </label>
            <span className="muted-t">
              {shown.length} z {items.length}
            </span>
          </div>
        )}
        {!items.length ? (
          <Empty icon="plus" title="Jeszcze nic tu nie ma">
            Dodaj pierwszą pozycję przyciskiem „Dodaj {def.one}”.
          </Empty>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 34 }} />
                  {def.cols!.map((c) => (
                    <th key={c.label} style={{ width: c.w }}>
                      {c.label}
                    </th>
                  ))}
                  <th style={{ width: 150 }} />
                </tr>
              </thead>
              <tbody>
                {shown.map(({ x, i }) => (
                  <tr
                    key={i}
                    className={`${drag === i ? 'dragging' : ''} clickable`}
                    onClick={() => go(`c/${id}/${i}`)}
                    onDragOver={(e) => drag !== null && e.preventDefault()}
                    onDrop={() => {
                      if (drag !== null) move(drag, i)
                      setDrag(null)
                    }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      {editable && !q && (
                        <span className="lf__grip" draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} title="Przeciągnij, aby zmienić kolejność">
                          <Icon n="drag" s={15} />
                        </span>
                      )}
                    </td>
                    {def.cols!.map((c, ci) => {
                      const v = c.get(x)
                      return (
                        <td key={c.label} className={ci === (def.cols![0].img ? 1 : 0) ? 'strong' : ''}>
                          {c.img ? v ? <img className="tbl__img" src={thumb(String(v))} alt="" loading="lazy" /> : <span className="tbl__img tbl__img--none" /> : typeof v === 'boolean' ? <Badge tone={v ? 'green' : 'gray'}>{v ? 'Tak' : 'Nie'}</Badge> : v}
                        </td>
                      )
                    })}
                    <td className="tbl__acts" onClick={(e) => e.stopPropagation()}>
                      {editable && (
                        <>
                          <Btn small kind="plain" icon="up" title="Wyżej" disabled={i === 0 || !!q} onClick={() => move(i, i - 1)} />
                          <Btn small kind="plain" icon="down" title="Niżej" disabled={i === items.length - 1 || !!q} onClick={() => move(i, i + 1)} />
                          <Btn small kind="plain" icon="copy" title="Duplikuj" onClick={() => write([...items.slice(0, i + 1), structuredClone(x), ...items.slice(i + 1)])} />
                          <Btn
                            small
                            kind="plain"
                            icon="trash"
                            title="Usuń"
                            onClick={async () => (await ask({ title: `Usunąć „${def.name?.(x) ?? 'pozycję'}”?`, text: 'Zmiana trafi na stronę po zapisaniu i publikacji.', yes: 'Usuń', danger: true })) && write(items.filter((_, j) => j !== i))}
                          />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open !== null && items[open] && (
        <Modal
          side
          title={def.name?.(items[open]) || def.title}
          onClose={() => go(`c/${id}`)}
          aside={id === 'posts' ? <SeoAssistant base={`posts.${open}`} /> : undefined}
          footer={
            <>
              <span className="muted-t grow">Zmiany zapisują się w wersji roboczej po kliknięciu „Zapisz” u góry.</span>
              <Btn kind="primary" onClick={() => go(`c/${id}`)}>
                Gotowe
              </Btn>
            </>
          }
        >
          <fieldset disabled={!editable} className="plain">
            <FieldForm fields={def.fields} base={`${id}.${open}`} />
          </fieldset>
        </Modal>
      )}
    </>
  )
}
