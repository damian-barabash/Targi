import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Ruch na stronie bez obciążania przeglądarki (2026-11-28, optymalizacja):
 * • przewijanie natywne (bez Lenis) — kompozytor przewija płynnie nawet przy zajętym wątku JS;
 * • paralaksa tylko w CSS (animation-timeline: view(), liczy ją kompozytor) — bez pętli rAF;
 * • odsłanianie kadrów: opacity + transform (bez clip-path, który przemalowywał zdjęcia co klatkę);
 * • nieskończone animacje (pasek logotypów, ruchome napisy) działają tylko, gdy są na ekranie.
 */
export default function Motion() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.classList.add('js')

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            reveal.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    )
    const h = window.innerHeight
    document.querySelectorAll<HTMLElement>('.tile__media, .split2__media, .feed__tile, .phero__media').forEach((f) => {
      if (f.getBoundingClientRect().top < h) f.classList.add('is-in')
      else reveal.observe(f)
    })

    // animacje w pętli zatrzymane poza ekranem
    const live = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle('is-live', e.isIntersecting)
      },
      { rootMargin: '100px 0px' },
    )
    document.querySelectorAll<HTMLElement>('.lrun, .marq').forEach((el) => live.observe(el))

    return () => {
      reveal.disconnect()
      live.disconnect()
    }
  }, [pathname])

  return null
}
