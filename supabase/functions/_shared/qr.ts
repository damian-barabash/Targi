// Kod QR: macierz modułów (qrcode-generator) + mały koder PNG (do maila jako obrazek inline).
import qrcode from 'npm:qrcode-generator@1.4.4'

export function qrMatrix(text: string): boolean[][] {
  const q = qrcode(0, 'M')
  q.addData(text)
  q.make()
  const n = q.getModuleCount()
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)))
}

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf: Uint8Array) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate')
  const out = new Response(new Blob([data]).stream().pipeThrough(cs))
  return new Uint8Array(await out.arrayBuffer())
}
function chunk(type: string, data: Uint8Array) {
  const out = new Uint8Array(12 + data.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, data.length)
  const td = new TextEncoder().encode(type)
  out.set(td, 4)
  out.set(data, 8)
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/** PNG w skali szarości: ciemne moduły w kolorze grafitu marki, margines 4 moduły. */
export async function qrPng(text: string, scale = 10): Promise<Uint8Array> {
  const m = qrMatrix(text)
  const quiet = 4
  const size = (m.length + quiet * 2) * scale
  const raw = new Uint8Array(size * (size + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0 // filtr: brak
    const my = Math.floor(y / scale) - quiet
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - quiet
      const dark = my >= 0 && mx >= 0 && my < m.length && mx < m.length && m[my][mx]
      raw[y * (size + 1) + 1 + x] = dark ? 0x26 : 0xff
    }
  }
  const ihdr = new Uint8Array(13)
  const dv = new DataView(ihdr.buffer)
  dv.setUint32(0, size)
  dv.setUint32(4, size)
  ihdr[8] = 8 // głębia
  ihdr[9] = 0 // skala szarości
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array())]
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let o = 0
  for (const p of parts) out.set(p, o), (o += p.length)
  return out
}

export const b64 = (u: Uint8Array) => {
  let s = ''
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(s)
}
