// Połączenie panelu z Supabase (logowanie, RPC, magazyn plików, funkcje).
import { createClient } from '@supabase/supabase-js'

export const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export const db = createClient(SUPA_URL, KEY, { auth: { storageKey: 'bhe-admin', persistSession: true, autoRefreshToken: true } })
export const STORAGE = `${SUPA_URL}/storage/v1/object/public/media`

export type Role = 'admin' | 'exhibitors' | 'tickets' | 'marketing' | 'reports'
export type Profile = { id: string; email: string; name: string; role: Role; active: boolean; created_at: string; last_seen_at: string | null }

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  exhibitors: 'Wystawcy',
  tickets: 'Bilety',
  marketing: 'Marketing',
  reports: 'Raporty (podgląd)',
}
export const ROLE_HELP: Record<Role, string> = {
  admin: 'Pełny dostęp: treści, bilety, użytkownicy, publikacja i przywracanie wersji.',
  exhibitors: 'Zgłoszenia, katalog wystawców, partnerzy i strefy.',
  tickets: 'Edycje, dane wydarzenia, bilety, catering, kody rabatowe i masterclass.',
  marketing: 'Strony, aktualności, FAQ, banery, media, newsletter, program i eksperci.',
  reports: 'Tylko podgląd pulpitu, statystyk i list — bez edycji.',
}

/** Wywołanie funkcji Edge; zwraca dane albo rzuca błąd z czytelnym komunikatem. */
export async function fn<R = any>(name: string, body: unknown): Promise<R> {
  const { data, error } = await db.functions.invoke(name, { body: body as Record<string, unknown> })
  if (error) {
    let msg = error.message
    try {
      const j = await (error as any).context?.json?.()
      if (j?.error) msg = j.error
    } catch {
      /* brak treści błędu */
    }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data as R
}

export async function rpc<R = any>(name: string, args?: Record<string, unknown>): Promise<R> {
  const { data, error } = await db.rpc(name, args)
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
  return data as R
}

/** CSV otwierany wprost w Excelu (średniki + BOM). */
export function downloadCsv(name: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export const fmtDate = (iso: string | null | undefined, time = true) =>
  iso ? new Date(iso).toLocaleString('pl-PL', time ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function ago(iso: string | null | undefined) {
  if (!iso) return '—'
  const s = (Date.now() - Date.parse(iso)) / 1000
  if (s < 60) return 'przed chwilą'
  if (s < 3600) return `${Math.floor(s / 60)} min temu`
  if (s < 86400) return `${Math.floor(s / 3600)} godz. temu`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} dni temu`
  return fmtDate(iso, false)
}
