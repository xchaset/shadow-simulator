import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export function usePlayback() {
  const rafRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const playback = useStore(s => s.playback)
  const setDateTime = useStore(s => s.setDateTime)

  // Use a ref to always read the latest dateTime without re-creating the loop
  const dateTimeRef = useRef(useStore.getState().dateTime)
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      dateTimeRef.current = state.dateTime
    })
    return unsub
  }, [])

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
      const newDate = new Date(dateTimeRef.current.getTime() + simMinutes * 60000)
      dateTimeRef.current = newDate
      setDateTime(newDate)

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playback.playing, playback.speed, setDateTime])
}
