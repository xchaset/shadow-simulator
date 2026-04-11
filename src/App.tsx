import { useState } from 'react'
import { SceneCanvas } from './components/Scene/SceneCanvas'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { BottomBar } from './components/Controls/BottomBar'
import { MapModal } from './components/MapPicker/MapModal'
import { usePlayback } from './hooks/usePlayback'
import './App.css'

function App() {
  const [mapOpen, setMapOpen] = useState(false)
  usePlayback()

  return (
    <div className="app">
      <Toolbar onOpenMap={() => setMapOpen(true)} />
      <div className="main-content">
        <SceneCanvas />
        <Sidebar />
      </div>
      <BottomBar />
      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  )
}

export default App
