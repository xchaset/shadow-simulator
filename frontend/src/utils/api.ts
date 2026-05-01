import type { Building } from '../types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── GLB Upload API ───────────────────────────────────────

export interface GlbUploadResult {
  success: boolean
  url: string
  filename: string
  size: number
}

export const glbApi = {
  upload: async (file: File): Promise<GlbUploadResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_BASE}/upload/glb`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    return res.json()
  },

  delete: (filename: string) =>
    request<{ success: boolean }>(`/uploads/glb/${filename}`, { method: 'DELETE' }),
}

// ─── Directory API ────────────────────────────────────────

export interface DirectoryDTO {
  id: string
  name: string
  description: string
  sort_order: number
  model_count?: number
  created_at: string
  updated_at: string
}

export const directoryApi = {
  list: () => request<DirectoryDTO[]>('/directories'),

  create: (name: string, description = '') =>
    request<DirectoryDTO>('/directories', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  update: (id: string, data: Partial<Pick<DirectoryDTO, 'name' | 'description' | 'sort_order'>>) =>
    request<DirectoryDTO>(`/directories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/directories/${id}`, { method: 'DELETE' }),

  copy: (id: string) =>
    request<DirectoryDTO>(`/directories/${id}/copy`, { method: 'POST' }),
}

// ─── Model API ────────────────────────────────────────────

export interface ModelDTO {
  id: string
  directory_id: string
  name: string
  description: string
  location_lat: number
  location_lng: number
  city_name: string
  date_time: string
  building_count: number
  scene_data?: Building[]
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateModelParams {
  name: string
  description?: string
  location_lat?: number
  location_lng?: number
  city_name?: string
  date_time?: string
  scene_data?: Building[]
}

export interface UpdateModelParams {
  name?: string
  description?: string
  location_lat?: number
  location_lng?: number
  city_name?: string
  date_time?: string
  scene_data?: Building[]
  sort_order?: number
  canvas_size?: number
  show_grid?: boolean
  grid_divisions?: number
  terrain_data?: { resolution: number; heights: number[]; maxHeight: number } | null
}

export const modelApi = {
  listByDirectory: (dirId: string) =>
    request<ModelDTO[]>(`/directories/${dirId}/models`),

  get: (id: string) =>
    request<ModelDTO>(`/models/${id}`),

  create: (dirId: string, params: CreateModelParams) =>
    request<ModelDTO>(`/directories/${dirId}/models`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  update: (id: string, params: UpdateModelParams) =>
    request<ModelDTO>(`/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/models/${id}`, { method: 'DELETE' }),

  copy: (id: string, targetDirectoryId?: string) =>
    request<ModelDTO>(`/models/${id}/copy`, {
      method: 'POST',
      body: JSON.stringify({ target_directory_id: targetDirectoryId }),
    }),

  move: (id: string, targetDirectoryId: string) =>
    request<ModelDTO>(`/models/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ target_directory_id: targetDirectoryId }),
    }),
}

// ─── Recent Models API ────────────────────────────────────

export interface RecentModelDTO extends ModelDTO {
  opened_at: string
}

export const recentModelApi = {
  list: (limit = 20) =>
    request<RecentModelDTO[]>(`/recent-models?limit=${limit}`),

  record: (modelId: string) =>
    request<{ success: boolean }>(`/recent-models/${modelId}`, { method: 'POST' }),

  remove: (modelId: string) =>
    request<{ success: boolean }>(`/recent-models/${modelId}`, { method: 'DELETE' }),
}

// ─── Model Version API ─────────────────────────────────────

export interface ModelVersionDTO {
  id: string
  model_id: string
  version_number: number
  name: string
  description: string
  location_lat: number
  location_lng: number
  city_name: string
  date_time: string
  building_count: number
  scene_data?: Building[]
  canvas_size: number
  show_grid: boolean
  grid_divisions: number
  thumbnail?: string
  terrain_data?: { resolution: number; heights: number[]; maxHeight: number } | null
  created_at: string
}

export const modelVersionApi = {
  list: (modelId: string, limit = 50) =>
    request<ModelVersionDTO[]>(`/models/${modelId}/versions?limit=${limit}`),

  get: (modelId: string, versionId: string) =>
    request<ModelVersionDTO>(`/models/${modelId}/versions/${versionId}`),

  restore: (modelId: string, versionId: string) =>
    request<ModelDTO>(`/models/${modelId}/versions/${versionId}/restore`, {
      method: 'POST',
    }),

  delete: (modelId: string, versionId: string) =>
    request<{ success: boolean }>(`/models/${modelId}/versions/${versionId}`, {
      method: 'DELETE',
    }),
}

// ─── Share API ────────────────────────────────────────────

export interface ShareDTO {
  id: string
  token: string
  model_id: string | null
  name: string
  description: string
  location_lat: number
  location_lng: number
  city_name: string
  date_time: string
  building_count: number
  scene_data?: Building[]
  canvas_size: number
  show_grid: boolean
  grid_divisions: number
  terrain_data?: { resolution: number; heights: number[]; maxHeight: number } | null
  expires_at: string | null
  view_count: number
  is_read_only: boolean
  created_at: string
}

export interface CreateShareParams {
  model_id?: string
  name: string
  description?: string
  location_lat?: number
  location_lng?: number
  city_name?: string
  date_time?: string
  scene_data?: Building[]
  canvas_size?: number
  show_grid?: boolean
  grid_divisions?: number
  terrain_data?: { resolution: number; heights: number[]; maxHeight: number } | null
  expires_in_hours?: number
}

export const shareApi = {
  create: (params: CreateShareParams) =>
    request<ShareDTO>('/shares', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  get: (token: string) =>
    request<ShareDTO>(`/shares/${token}`),

  listByModel: (modelId: string) =>
    request<ShareDTO[]>(`/shares/model/${modelId}`),

  delete: (token: string) =>
    request<{ success: boolean }>(`/shares/${token}`, {
      method: 'DELETE',
    }),
}
