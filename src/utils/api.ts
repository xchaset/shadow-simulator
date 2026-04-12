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

// ─── Directory API ───────────────────────────────────────────

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
}

// ─── Model API ───────────────────────────────────────────────

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
  scene_data?: string   // JSON string of Building[]
  sort_order: number
  created_at: string
  updated_at: string
}

export const modelApi = {
  listByDirectory: (dirId: string) =>
    request<ModelDTO[]>(`/directories/${dirId}/models`),

  get: (id: string) =>
    request<ModelDTO>(`/models/${id}`),

  create: (dirId: string, data: {
    name: string
    description?: string
    location_lat?: number
    location_lng?: number
    city_name?: string
    date_time?: string
    scene_data?: string
  }) =>
    request<ModelDTO>(`/directories/${dirId}/models`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Omit<ModelDTO, 'id' | 'created_at' | 'updated_at'>>) =>
    request<ModelDTO>(`/models/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/models/${id}`, { method: 'DELETE' }),
}
