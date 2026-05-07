import { useState, useEffect, useCallback } from 'react'

interface FullscreenHook {
  isFullscreen: boolean
  toggleFullscreen: () => Promise<void>
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => Promise<void>
}

function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement ||
    null
  )
}

async function requestFullscreen(element: HTMLElement): Promise<void> {
  if (element.requestFullscreen) {
    await element.requestFullscreen()
  } else if ((element as any).webkitRequestFullscreen) {
    await (element as any).webkitRequestFullscreen()
  } else if ((element as any).mozRequestFullScreen) {
    await (element as any).mozRequestFullScreen()
  } else if ((element as any).msRequestFullscreen) {
    await (element as any).msRequestFullscreen()
  }
}

async function exitFullscreen(): Promise<void> {
  if (document.exitFullscreen) {
    await document.exitFullscreen()
  } else if ((document as any).webkitExitFullscreen) {
    await (document as any).webkitExitFullscreen()
  } else if ((document as any).mozCancelFullScreen) {
    await (document as any).mozCancelFullScreen()
  } else if ((document as any).msExitFullscreen) {
    await (document as any).msExitFullscreen()
  }
}

function getFullscreenChangeEventName(): string {
  if ('onfullscreenchange' in document) {
    return 'fullscreenchange'
  }
  if ('onwebkitfullscreenchange' in document) {
    return 'webkitfullscreenchange'
  }
  if ('onmozfullscreenchange' in document) {
    return 'mozfullscreenchange'
  }
  if ('onMSFullscreenChange' in document) {
    return 'MSFullscreenChange'
  }
  return 'fullscreenchange'
}

export function useFullscreen(): FullscreenHook {
  const [isFullscreen, setIsFullscreen] = useState(() => getFullscreenElement() !== null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      const hasFullscreenElement = getFullscreenElement() !== null
      setIsFullscreen(hasFullscreenElement)
    }

    const eventName = getFullscreenChangeEventName()
    document.addEventListener(eventName, handleFullscreenChange)

    return () => {
      document.removeEventListener(eventName, handleFullscreenChange)
    }
  }, [])

  const enterFullscreen = useCallback(async () => {
    if (getFullscreenElement()) {
      return
    }
    try {
      await requestFullscreen(document.documentElement)
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }, [])

  const exitFullscreenFn = useCallback(async () => {
    if (!getFullscreenElement()) {
      return
    }
    try {
      await exitFullscreen()
    } catch (error) {
      console.error('Failed to exit fullscreen:', error)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (getFullscreenElement()) {
      await exitFullscreenFn()
    } else {
      await enterFullscreen()
    }
  }, [enterFullscreen, exitFullscreenFn])

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen: exitFullscreenFn,
  }
}
