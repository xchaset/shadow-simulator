import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export function usePlayback() {
  const rafRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const playback = useStore(s => s.playback)
  const dateTime = useStore(s => s.dateTime)
  const setDateTime = useStore(s => s.setDateTime)

  useEffect(() => {
    if (!playback.playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    lastTimeRef.current = performance.now()

    const animate = (now: number) => {
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now

      // Each real second = speed minutes of simulated time
      const simMinutes = (delta / 1000) * playback.speed
      const newDate = new Date(dateTime.getTime() + simMinutes * 60000)
      setDateTime(newDate)

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playback.playing, playback.speed])
  // Note: dateTime and setDateTime intentionally excluded from deps
  // to avoid re-creating the animation loop on every frame
}
