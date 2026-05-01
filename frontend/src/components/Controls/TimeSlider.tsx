import { useMemo, useCallback, useRef } from 'react'
import { Slider } from 'antd'
import { useStore } from '../../store/useStore'
import { useSunPosition } from '../../hooks/useSunPosition'
import { formatTime } from '../../utils/sunCalc'

const SLIDER_STYLE = { margin: '0 8px' }

export function TimeSlider() {
  const dateTime = useStore(s => s.dateTime)
  const setDateTime = useStore(s => s.setDateTime)
  const { sunrise, sunset } = useSunPosition()

  const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes()
  const sunriseMin = sunrise.getHours() * 60 + sunrise.getMinutes()
  const sunsetMin = sunset.getHours() * 60 + sunset.getMinutes()

  // Keep a ref so the stable callback always reads the latest dateTime
  const dateTimeRef = useRef(dateTime)
  dateTimeRef.current = dateTime

  const handleChange = useCallback((value: number) => {
    const newDate = new Date(dateTimeRef.current)
    newDate.setHours(Math.floor(value / 60), value % 60, 0, 0)
    setDateTime(newDate)
  }, [setDateTime])

  const marks = useMemo(() => ({
    [sunriseMin]: { style: { fontSize: 10 } as const, label: '🌅' },
    [sunsetMin]: { style: { fontSize: 10 } as const, label: '🌇' },
  }), [sunriseMin, sunsetMin])

  const tooltip = useMemo(() => ({
    formatter: (v: number | undefined) =>
      v != null
        ? `${Math.floor(v / 60).toString().padStart(2, '0')}:${(v % 60).toString().padStart(2, '0')}`
        : '',
  }), [])

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 2 }}>
        <span>🕐 时间: {formatTime(dateTime)}</span>
        <span>🌅 {formatTime(sunrise)} — 🌇 {formatTime(sunset)}</span>
      </div>
      <Slider
        min={0}
        max={1440}
        value={currentMinutes}
        onChange={handleChange}
        tooltip={tooltip}
        marks={marks}
        style={SLIDER_STYLE}
      />
    </div>
  )
}
