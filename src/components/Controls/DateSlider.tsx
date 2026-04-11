import { Slider } from 'antd'
import { useStore } from '../../store/useStore'

export function DateSlider() {
  const dateTime = useStore(s => s.dateTime)
  const setDateTime = useStore(s => s.setDateTime)

  // Calculate day of year
  const startOfYear = new Date(dateTime.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((dateTime.getTime() - startOfYear.getTime()) / 86400000) + 1

  const handleChange = (day: number) => {
    const newDate = new Date(dateTime.getFullYear(), 0, day)
    newDate.setHours(dateTime.getHours(), dateTime.getMinutes(), 0, 0)
    setDateTime(newDate)
  }

  const monthStr = `${dateTime.getFullYear()}-${(dateTime.getMonth()+1).toString().padStart(2,'0')}-${dateTime.getDate().toString().padStart(2,'0')}`

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
        tooltip={{ formatter: (v) => {
          if (!v) return ''
          const d = new Date(dateTime.getFullYear(), 0, v)
          return `${d.getMonth()+1}月${d.getDate()}日`
        }}}
        marks={{
          1: { style: { fontSize: 10 }, label: '1月' },
          91: { style: { fontSize: 10 }, label: '4月' },
          182: { style: { fontSize: 10 }, label: '7月' },
          274: { style: { fontSize: 10 }, label: '10月' },
        }}
        style={{ margin: '0 8px' }}
      />
    </div>
  )
}
