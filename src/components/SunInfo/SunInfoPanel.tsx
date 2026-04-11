import { useSunPosition } from '../../hooks/useSunPosition'
import { formatTime, getDaylightDuration } from '../../utils/sunCalc'

export function SunInfoPanel() {
  const { sunrise, sunset, altitude, azimuth, isNight } = useSunPosition()

  const altDeg = ((altitude * 180) / Math.PI).toFixed(1)
  const aziDeg = (((azimuth * 180) / Math.PI + 180) % 360).toFixed(1)
  const duration = getDaylightDuration(sunrise, sunset)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 12,
      color: '#666',
    }}>
      <span>🌅 {formatTime(sunrise)}</span>
      <span>🌇 {formatTime(sunset)}</span>
      <span>☀️ {duration}</span>
      <span>📐 {altDeg}°</span>
      <span>🧭 {aziDeg}°</span>
      {isNight && <span style={{ color: '#1677ff' }}>🌙 夜间</span>}
    </div>
  )
}
