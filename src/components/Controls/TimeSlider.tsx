import { Slider } from 'antd'
import { useStore } from '../../store/useStore'
import { useSunPosition } from '../../hooks/useSunPosition'
import { formatTime } from '../../utils/sunCalc'

export function TimeSlider() {
  const dateTime = useStore(s => s.dateTime)
  const setDateTime = useStore(s => s.setDateTime)
  const { sunrise, sunset } = useSunPosition()

  const currentMinutes = dateTime.getHours() * 60 + dateTime.getMinutes()
  const sunriseMin = sunrise.getHours() * 60 + sunrise.getMinutes()
  const sunsetMin = sunset.getHours() * 60 + sunset.getMinutes()

  const handleChange = (value: number) => {
    const newDate = new Date(dateTime)
    newDate.setHours(Math.floor(value / 60), value % 60, 0, 0)
    setDateTime(newDate)
  }

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
        tooltip={{ formatter: (v) => v ? `${Math.floor(v/60).toString().padStart(2,'0')}:${(v%60).toString().padStart(2,'0')}` : '' }}
        marks={{
          [sunriseMin]: { style: { fontSize: 10 }, label: '🌅' },
          [sunsetMin]: { style: { fontSize: 10 }, label: '🌇' },
        }}
        style={{ margin: '0 8px' }}
      />
    </div>
  )
}
