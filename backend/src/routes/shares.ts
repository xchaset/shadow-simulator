import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { validate } from '../middleware/validator.js'
import * as schema from '../schemas/shares.js'

const router = Router()

function generateToken(): string {
  return Math.random().toString(36).substring(2, 10) + 
         Math.random().toString(36).substring(2, 10)
}

/** Parse share row (similar to parseRow in models.ts) */
function parseShareRow(row: any) {
  if (!row) return row
  if (typeof row.scene_data === 'string') {
    try { row.scene_data = JSON.parse(row.scene_data) } catch { row.scene_data = [] }
  }
  if (typeof row.terrain_data === 'string') {
    try {
      const parsed = JSON.parse(row.terrain_data)
      row.terrain_data = parsed
    } catch { row.terrain_data = null }
  }
  if (row.show_grid !== undefined && row.show_grid !== null) {
    row.show_grid = !!row.show_grid
  }
  if (row.is_read_only !== undefined && row.is_read_only !== null) {
    row.is_read_only = !!row.is_read_only
  }
  return row
}

/** Serialize terrain data for storage */
function serializeTerrainData(terrain_data: any): string | null {
  if (!terrain_data || !terrain_data.heights) {
    return null
  }
  
  return JSON.stringify({
    ...terrain_data,
    heights: Array.from(terrain_data.heights),
  })
}

/** Normalize scene data */
function normalizeSceneData(data: any): { str: string; count: number } {
  if (data === undefined || data === null) return { str: '[]', count: 0 }
  let arr: any[]
  if (typeof data === 'string') {
    try { arr = JSON.parse(data) } catch { arr = [] }
  } else if (Array.isArray(data)) {
    arr = data
  } else {
    arr = []
  }
  return { str: JSON.stringify(arr), count: arr.length }
}

// ─── POST /api/shares ──────────────────────────────────────
router.post('/shares', validate(schema.createShare), (req, res) => {
  const {
    model_id, name, description, location_lat, location_lng,
    city_name, date_time, scene_data, canvas_size, show_grid,
    grid_divisions, terrain_data, expires_in_hours,
  } = req.body

  const { str: sceneStr, count: buildingCount } = normalizeSceneData(scene_data)
  const id = uuidv4()
  const token = generateToken()
  const dt = date_time || new Date().toISOString()

  const terrainStr = serializeTerrainData(terrain_data)
  const showGridValue = show_grid !== undefined ? (show_grid ? 1 : 0) : 1

  let expiresAt: string | null = null
  if (expires_in_hours) {
    const now = new Date()
    now.setHours(now.getHours() + expires_in_hours)
    expiresAt = now.toISOString()
  }

  db.prepare(`
    INSERT INTO shares (
      id, token, model_id, name, description, location_lat, location_lng,
      city_name, date_time, building_count, scene_data, canvas_size, show_grid,
      grid_divisions, terrain_data, expires_at, view_count, is_read_only
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `).run(
    id,
    token,
    model_id || null,
    name,
    description || '',
    location_lat ?? 39.9042,
    location_lng ?? 116.4074,
    city_name || '北京',
    dt,
    buildingCount,
    sceneStr,
    canvas_size ?? 2000,
    showGridValue,
    grid_divisions ?? 200,
    terrainStr,
    expiresAt
  )

  const row = db.prepare('SELECT * FROM shares WHERE id = ?').get(id)
  res.status(201).json(parseShareRow(row))
})

// ─── GET /api/shares/:token ─────────────────────────────────
router.get('/shares/:token', validate(schema.getShare), (req, res) => {
  const { token } = req.params
  
  const row: any = db.prepare('SELECT * FROM shares WHERE token = ?').get(token)
  
  if (!row) {
    res.status(404).json({ error: '分享链接不存在或已过期' })
    return
  }

  if (row.expires_at) {
    const expireDate = new Date(row.expires_at)
    const now = new Date()
    if (now > expireDate) {
      res.status(410).json({ error: '分享链接已过期' })
      return
    }
  }

  db.prepare('UPDATE shares SET view_count = view_count + 1 WHERE token = ?').run(token)

  const updatedRow = db.prepare('SELECT * FROM shares WHERE token = ?').get(token)
  res.json(parseShareRow(updatedRow))
})

// ─── GET /api/shares/model/:modelId ─────────────────────────
router.get('/shares/model/:modelId', validate(schema.getShareByModel), (req, res) => {
  const { modelId } = req.params
  
  const rows = db.prepare(`
    SELECT id, token, name, description, building_count, view_count, 
           expires_at, created_at, is_read_only
    FROM shares
    WHERE model_id = ?
    ORDER BY created_at DESC
  `).all(modelId)
  
  res.json(rows.map(parseShareRow))
})

// ─── DELETE /api/shares/:token ───────────────────────────────
router.delete('/shares/:token', validate(schema.getShare), (req, res) => {
  const { token } = req.params
  
  const existing = db.prepare('SELECT id FROM shares WHERE token = ?').get(token)
  if (!existing) {
    res.status(404).json({ error: '分享链接不存在' })
    return
  }
  
  db.prepare('DELETE FROM shares WHERE token = ?').run(token)
  res.json({ success: true })
})

export default router
