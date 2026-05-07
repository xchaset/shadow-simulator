import { useEffect, useRef } from 'react'
import { Button } from 'antd'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'
import { useFullscreen } from '../../hooks/useFullscreen'

export function FullscreenButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const toggleFullscreenRef = useRef(toggleFullscreen)

  useEffect(() => {
    toggleFullscreenRef.current = toggleFullscreen
  }, [toggleFullscreen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        e.stopPropagation()
        toggleFullscreenRef.current()
        return false
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  return (
    <Button
      size="small"
      type={isFullscreen ? 'primary' : 'default'}
      icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
      onClick={toggleFullscreen}
      title={isFullscreen ? '退出全屏 (F11)' : '全屏 (F11)'}
      style={{ flexShrink: 0 }}
    >
      {isFullscreen ? '退出全屏' : '全屏'}
    </Button>
  )
}
