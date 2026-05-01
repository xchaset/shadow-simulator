import { useMemo, useCallback, useRef } from 'react'
import { Slider } from 'antd'
import { useStore } from '../../store/useStore'

const MARKS = {
  1: { style: { fontSize: 10 } as const, label: '1月' },
  91: { style: { fontSize: 10 } as const, label: '4月' },
  182: { style: { fontSize: 10 } as const, label: '7月' },
  274: { style: { fontSize: 10 } as const, label: '10月' },
}

const SLIDER_STYLE = { margin: '0 8px' }

export function DateSlider() {
  const dateTime = useStore(s => s.dateTime)
  const setDateTime = useStore(s => s.setDateTime)

  // Calculate day of year
  const startOfYear = new Date(dateTime.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((dateTime.getTime() - startOfYear.getTime()) / 86400000) + 1

  const dateTimeRef = useRef(dateTime)
  dateTimeRef.current = dateTime

  const handleChange = useCallback((day: number) => {
    const dt = dateTimeRef.current
    const newDate = new Date(dt.getFullYear(), 0, day)
    newDate.setHours(dt.getHours(), dt.getMinutes(), 0, 0)
    setDateTime(newDate)
  }, [setDateTime])

  const year = dateTime.getFullYear()

  const tooltip = useMemo(() => ({
    formatter: (v: number | undefined) => {
      if (!v) return ''
      const d = new Date(year, 0, v)
      return `${d.getMonth() + 1}月${d.getDate()}日`
    },
  }), [year])

  const monthStr = `${dateTime.getFullYear()}-${(dateTime.getMonth() + 1).toString().padStart(2, '0')}-${dateTime.getDate().toString().padStart(2, '0')}`

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>
        📅 日期: {monthStr}
      </div>
      <Slider
        min={1}
        max={365}
        value={dayOfYear}
        onChange={handleChange}
        tooltip={tooltip}
        marks={MARKS}
        style={SLIDER_STYLE}
      />
    </div>
  )
}
