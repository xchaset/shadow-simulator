const STORAGE_KEY = 'shadow-simulator'
const CAMERA_KEY = 'shadow-simulator-camera'

export interface StorageState {
  lastModelId: string | null
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}

function getDefault(): StorageState {
  return { lastModelId: null }
}

export function loadState(): StorageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefault()
    return { ...getDefault(), ...JSON.parse(raw) }
  } catch {
    return getDefault()
  }
}

export function saveState(updates: Partial<StorageState>) {
  const current = loadState()
  const next = { ...current, ...updates }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore quota errors
  }
}

// ─── Camera persistence (per-model) ──────────────────────

function cameraKey(modelId: string): string {
  return `${CAMERA_KEY}:${modelId}`
}

export function saveCameraState(modelId: string, state: CameraState) {
  try {
    localStorage.setItem(cameraKey(modelId), JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
}

export function loadCameraState(modelId: string): CameraState | null {
  try {
    const raw = localStorage.getItem(cameraKey(modelId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.position?.length === 3 && parsed?.target?.length === 3) {
      return parsed as CameraState
    }
    return null
  } catch {
    return null
  }
}
