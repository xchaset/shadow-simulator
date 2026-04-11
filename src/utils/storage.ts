import type { Building, Location } from '../types'

const STORAGE_KEY = 'shadow-simulator-scene'

interface SceneData {
  buildings: Building[]
  location: Location
  dateTime: string
}

export function saveScene(buildings: Building[], location: Location, dateTime: Date): void {
  const data: SceneData = {
    buildings,
    location,
    dateTime: dateTime.toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save scene:', e)
  }
}

export function loadScene(): { buildings: Building[]; location: Location; dateTime: Date } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: SceneData = JSON.parse(raw)
    if (!data.buildings || !data.location) return null
    return {
      buildings: data.buildings,
      location: data.location,
      dateTime: new Date(data.dateTime),
    }
  } catch {
    return null
  }
}

export function exportSceneJSON(buildings: Building[], location: Location, dateTime: Date): string {
  return JSON.stringify({
    buildings,
    location,
    dateTime: dateTime.toISOString(),
    version: '1.0',
    exportedAt: new Date().toISOString(),
  }, null, 2)
}

export function importSceneJSON(json: string): { buildings: Building[]; location: Location; dateTime: Date } | null {
  try {
    const data = JSON.parse(json)
    if (!data.buildings || !Array.isArray(data.buildings) || !data.location) return null
    return {
      buildings: data.buildings,
      location: data.location,
      dateTime: data.dateTime ? new Date(data.dateTime) : new Date(),
    }
  } catch {
    return null
  }
}
