import { TimeSlider } from './TimeSlider'
import { DateSlider } from './DateSlider'
import { PlaybackControls } from './PlaybackControls'

export function BottomBar() {
  return (
    <div style={{
      padding: '10px 20px 12px',
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <DateSlider />
        <PlaybackControls />
      </div>
      <TimeSlider />
    </div>
  )
}
