import { useMemo, useCallback, useRef } from 'react'
import { Slider, Button, Select } from 'antd'
import {
  CaretRightOutlined, PauseOutlined,
  CalendarOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import { useStore } from '../../store/useStore'
import { useSunPosition } from '../../hooks/useSunPosition'
import { formatTime } from '../../utils/sunCalc'

export function TimelinePanel() {
  const dateTime = useStore(s => s.dateTime)
  const setDateTime = useStore(s => s.setDateTime)
  const playback = useStore(s => s.playback)
  const setPlayback = useStore(s => s.setPlayback)
  const { sunrise, sunset } = useSunPosition()

  // ─── Date ──────────────────────────────────────────────
  const startOfYear = new Date(dateTime.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((dateTime.getTime() - startOfYear.getTime()) / 86400000) + 1
  const year = dateTime.getFullYear()

  const dateTimeRef = useRef(dateTime)
  dateTimeRef.current = dateTime

  const handleDateChange = useCallback((day: number) => {
    const dt = dateTimeRef.current
    const newDate = new Date(dt.getFullYear(), 0, day)
    newDate.setHours(dt.getHours(), dt.getMinutes(), 0, 0)
    setDateTime(newDate)
  }, [setDateTime])

  const dateTooltip = useMemo(() => ({
    formatter: (v: number | undefined) => {
      if (!v) return ''
      const d = new Date(year, 0, v)
      return `${d.getMonth() + 1}月${d.getDate()}日`
    },
  }), [year])

  // ─── Time ──────────────────────────────────────────────
  const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes()
  const sunriseMin = sunrise.getHours() * 60 + sunrise.getMinutes()
  const sunsetMin = sunset.getHours() * 60 + sunset.getMinutes()

  const handleTimeChange = useCallback((value: number) => {
    const newDate = new Date(dateTimeRef.current)
    newDate.setHours(Math.floor(value / 60), value % 60, 0, 0)
    setDateTime(newDate)
  }, [setDateTime])

  const timeMarks = useMemo(() => ({
    [sunriseMin]: { style: { fontSize: 9, color: '#999' } as const, label: formatTime(sunrise) },
    [sunsetMin]: { style: { fontSize: 9, color: '#999' } as const, label: formatTime(sunset) },
  }), [sunriseMin, sunsetMin, sunrise, sunset])

  const timeTooltip = useMemo(() => ({
    formatter: (v: number | undefined) =>
      v != null
        ? `${Math.floor(v / 60).toString().padStart(2, '0')}:${(v % 60).toString().padStart(2, '0')}`
        : '',
  }), [])

  const dateStr = `${dateTime.getMonth() + 1}月${dateTime.getDate()}日`
  const timeStr = formatTime(dateTime)

  return (
    <>
      {/* ── 日期轴：左侧，无背景 ── */}
      <div style={{
        position: 'absolute',
        left: 12,
        top: 12,
        bottom: 60,
        width: 36,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
        pointerEvents: 'auto',
      }}>
        <CalendarOutlined style={{ fontSize: 13, color: '#888', marginBottom: 2 }} />
        <div style={{ fontSize: 10, color: '#999', marginBottom: 4, whiteSpace: 'nowrap' }}>{dateStr}</div>
        <div style={{ flex: 1, minHeight: 60 }}>
          <Slider
            vertical
            min={1}
            max={365}
            value={dayOfYear}
            onChange={handleDateChange}
            tooltip={dateTooltip}
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* ── 时间轴：底部水平，无背景 ── */}
      <div style={{
        position: 'absolute',
        left: 60,
        right: 12,
        bottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 10,
        pointerEvents: 'auto',
      }}>
        <ClockCircleOutlined style={{ fontSize: 13, color: '#888', flexShrink: 0 }} />
        <div style={{ fontSize: 10, color: '#999', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeStr}</div>
        <div style={{ flex: 1 }}>
          <Slider
            min={0}
            max={1440}
            value={currentMinutes}
            onChange={handleTimeChange}
            tooltip={timeTooltip}
            marks={timeMarks}
          />
        </div>
        {/* 播放控制 */}
        <Button
          type={playback.playing ? 'primary' : 'default'}
          shape="circle"
          size="small"
          icon={playback.playing ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={() => setPlayback({ playing: !playback.playing })}
          style={{ flexShrink: 0 }}
        />
        <Select
          value={playback.speed}
          onChange={(v) => setPlayback({ speed: v })}
          size="small"
          variant="borderless"
          style={{ width: 52, fontSize: 11, flexShrink: 0 }}
          popupMatchSelectWidth={false}
          options={[
            { value: 1, label: '1x' },
            { value: 2, label: '2x' },
            { value: 5, label: '5x' },
            { value: 10, label: '10x' },
            { value: 30, label: '30x' },
          ]}
        />
      </div>
    </>
  )
}
