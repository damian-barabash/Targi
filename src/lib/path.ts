// Dostęp do zagnieżdżonych pól po ścieżce "tickets.0.name.pl".
export function getIn(obj: any, path: string): any {
  let o = obj
  for (const k of path.split('.')) {
    if (o == null) return undefined
    o = o[k]
  }
  return o
}

/** Zwraca kopię obiektu ze zmienioną wartością (niemutująco, tylko po drodze do pola). */
export function setIn<V>(obj: V, path: string, value: unknown): V {
  const keys = path.split('.')
  const walk = (o: any, i: number): any => {
    const k = keys[i]
    const base = Array.isArray(o) ? [...o] : { ...(o ?? (/^\d+$/.test(k) ? [] : {})) }
    base[k] = i === keys.length - 1 ? value : walk(o?.[k], i + 1)
    return base
  }
  return walk(obj, 0)
}
