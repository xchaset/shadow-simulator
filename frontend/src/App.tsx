import { useState } from 'react'
import { SceneCanvas } from './components/Scene/SceneCanvas'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TimelinePanel } from './components/Controls/TimelinePanel'
import { MapModal } from './components/MapPicker/MapModal'
import { ProjectSidebar } from './components/ProjectSidebar/ProjectSidebar'
import { HelpButton } from './components/HelpGuide/HelpButton'
import { usePlayback } from './hooks/usePlayback'
import './App.css'

function App() {
  const [mapOpen, setMapOpen] = useState(false)
  usePlayback()

  return (
    <div className="app">
      <Toolbar onOpenMap={() => setMapOpen(true)} />
      <div className="main-content">
        <ProjectSidebar />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
          <SceneCanvas />
          <TimelinePanel />
        </div>
        <Sidebar />
      </div>
      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
      <HelpButton />
    </div>
  )
}

export default App
