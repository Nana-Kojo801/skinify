import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * True once the element has scrolled into view (and stays true). Drives the reveal, ring and chart animations.
 * Uses a callback ref, so it also works for elements that only mount after their data loads.
 */
export function useInView<T extends Element>(rootMargin = '0px 0px -8% 0px') {
  const [node, setNode] = useState<T | null>(null)
  // With reduced motion (or no IntersectionObserver) everything is simply shown.
  const [inView, setInView] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (!node || inView) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, inView, rootMargin])
  return [setNode as (instance: T | null) => void, inView] as const
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/**
 * Animates a number from 0 to `value` once `start` is true. Writes straight to the DOM node with
 * requestAnimationFrame instead of setting React state, so a screen full of count-ups costs no re-renders.
 */
export function useCountUp<T extends HTMLElement>(value: number, format: (n: number) => string, start: boolean, duration = 1200) {
  const ref = useRef<T>(null)
  const formatRef = useRef(format)
  useLayoutEffect(() => {
    formatRef.current = format
  })
  // Layout effect: the starting value is in place before the browser paints, so the final number never flashes.
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    if (!start) {
      node.textContent = formatRef.current(0)
      return
    }
    if (prefersReducedMotion()) {
      node.textContent = formatRef.current(value)
      return
    }
    let frame = 0
    const began = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / duration)
      node.textContent = formatRef.current(value * easeOutCubic(progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, start, duration])
  return ref
}
