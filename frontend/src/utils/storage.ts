const STORAGE_KEY = 'shadow-simulator'

export interface StorageState {
  lastModelId: string | null
  recentModels: { id: string; name: string; updatedAt: string }[]
}

function getDefault(): StorageState {
  return { lastModelId: null, recentModels: [] }
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

/** 记录模型打开历史 */
export function recordModelOpen(id: string, name: string, updatedAt: string) {
  const { recentModels } = loadState()
  const filtered = recentModels.filter(m => m.id !== id)
  filtered.unshift({ id, name, updatedAt })
  saveState({ lastModelId: id, recentModels: filtered.slice(0, 20) })
}

/** 清除已删除模型的记录 */
export function removeModelFromRecent(id: string) {
  const { recentModels, lastModelId } = loadState()
  const filtered = recentModels.filter(m => m.id !== id)
  saveState({
    recentModels: filtered,
    lastModelId: lastModelId === id ? null : lastModelId,
  })
}
