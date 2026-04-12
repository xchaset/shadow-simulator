import { Button, Select } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import { useStore } from '../../store/useStore'

export function PlaybackControls() {
  const playback = useStore(s => s.playback)
  const setPlayback = useStore(s => s.setPlayback)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button
        type="text"
        icon={playback.playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
        onClick={() => setPlayback({ playing: !playback.playing })}
        size="small"
      />
      <Select
        value={playback.speed}
        onChange={(v) => setPlayback({ speed: v })}
        size="small"
        style={{ width: 70 }}
        options={[
          { value: 1, label: '1x' },
          { value: 2, label: '2x' },
          { value: 5, label: '5x' },
          { value: 10, label: '10x' },
          { value: 30, label: '30x' },
        ]}
      />
    </div>
  )
}
