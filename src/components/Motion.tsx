import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Płynne przewijanie (Lenis) + paralaksa zdjęć + odsłanianie kadrów.
 * Lekkie: jedna pętla rAF, liczymy tylko widoczne zdjęcia (IntersectionObserver),
 * zmieniamy wyłącznie transform (GPU). Wyłączone na dotyku i przy reduced motion.
 */
const SELECTOR = '.hero__img, .phero__media img, .split2__media img, .tile__media img, .feed__tile img, .pfx-img'

export default function Motion() {
  const { pathname } = useLocation()

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('js')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches

    // odsłanianie kadrów działa wszędzie (tanie: jedna klasa + clip-path w CSS)
    const frames = Array.from(document.querySelectorAll<HTMLElement>('.tile__media, .split2__media, .feed__tile, .phero__media'))
    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            revealIO.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    )
    frames.forEach((f) => {
      if (f.getBoundingClientRect().top < window.innerHeight) f.classList.add('is-in')
      else revealIO.observe(f)
    })

    if (reduce || !fine) return () => revealIO.disconnect()

    let lenis: { raf: (t: number) => void; destroy: () => void; scrollTo: (y: number, o?: object) => void } | null = null
    let raf = 0
    let alive = true
    const visible = new Set<HTMLElement>()
    const imgs = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR))
    imgs.forEach((img) => img.classList.add('pfx'))

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement
          if (e.isIntersecting) visible.add(el)
          else visible.delete(el)
        }
      },
      { rootMargin: '20% 0px 20% 0px' },
    )
    imgs.forEach((img) => io.observe(img))

    const mark = document.querySelector<HTMLElement>('.hero__mark')
    const vh = () => window.innerHeight

    const update = () => {
      const h = vh()
      for (const img of visible) {
        const box = (img.parentElement ?? img).getBoundingClientRect()
        // -1 (pod ekranem) … 1 (nad ekranem)
        const p = (box.top + box.height / 2 - h / 2) / (h / 2 + box.height / 2)
        const strength = img.classList.contains('hero__img') ? 0.18 : 0.08
        img.style.transform = `translate3d(0, ${(-p * box.height * strength).toFixed(1)}px, 0) scale(1.16)`
      }
      if (mark) {
        const y = Math.min(window.scrollY, h)
        mark.style.transform = `translate3d(0, ${(y * 0.25).toFixed(1)}px, 0)`
        mark.style.opacity = String(Math.max(0, 1 - y / (h * 0.8)))
      }
    }

    const loop = (t: number) => {
      lenis?.raf(t)
      update()
      raf = requestAnimationFrame(loop)
    }

    import('lenis').then(({ default: Lenis }) => {
      if (!alive) return
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -60 } }) as unknown as typeof lenis
      raf = requestAnimationFrame(loop)
    })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      io.disconnect()
      revealIO.disconnect()
      lenis?.destroy()
      imgs.forEach((img) => {
        img.style.transform = ''
        img.classList.remove('pfx')
      })
      if (mark) {
        mark.style.transform = ''
        mark.style.opacity = ''
      }
    }
  }, [pathname])

  return null
}
