import { TimeSlider } from './TimeSlider'
import { DateSlider } from './DateSlider'
import { PlaybackControls } from './PlaybackControls'

export function BottomBar() {
  return (
    <div style={{
      padding: '8px 16px',
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <DateSlider />
        <PlaybackControls />
      </div>
      <TimeSlider />
    </div>
  )
}
