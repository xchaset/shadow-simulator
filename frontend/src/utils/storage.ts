const STORAGE_KEY = 'shadow-simulator'

export interface StorageState {
  lastModelId: string | null
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
