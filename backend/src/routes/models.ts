import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { validate } from '../middleware/validator.js'
import * as schema from '../schemas/models.js'

const router = Router()

/** Ensure scene_data is always a string for SQLite */
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

/** Parse scene_data string back to array in response */
function parseRow(row: any) {
  if (!row) return row
  if (typeof row.scene_data === 'string') {
    try { row.scene_data = JSON.parse(row.scene_data) } catch { row.scene_data = [] }
  }
  return row
}

// ─── GET /api/directories/:dirId/models ───────────────────
router.get('/directories/:dirId/models', validate(schema.listModels), (req, res) => {
  const { dirId } = req.params
  const rows = db.prepare(`
    SELECT id, directory_id, name, description, location_lat, location_lng,
           city_name, date_time, building_count, canvas_size, show_grid, grid_divisions,
           sort_order, created_at, updated_at
    FROM models
    WHERE directory_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `).all(dirId)
  res.json(rows)
})

// ─── POST /api/directories/:dirId/models ──────────────────
router.post('/directories/:dirId/models', validate(schema.createModel), (req, res) => {
  const { dirId } = req.params

  const dir = db.prepare('SELECT id FROM directories WHERE id = ?').get(dirId)
  if (!dir) { res.status(404).json({ error: '目录不存在' }); return }

  const {
    name, description, location_lat, location_lng,
    city_name, date_time, scene_data, sort_order,
    canvas_size, show_grid, grid_divisions,
  } = req.body

  const { str: sceneStr, count: buildingCount } = normalizeSceneData(scene_data)
  const id = uuidv4()
  const dt = date_time || new Date().toISOString()

  db.prepare(`
    INSERT INTO models (id, directory_id, name, description, location_lat, location_lng,
                        city_name, date_time, building_count, scene_data, sort_order,
                        canvas_size, show_grid, grid_divisions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, dirId, name, description, location_lat, location_lng,
         city_name, dt, buildingCount, sceneStr, sort_order,
         canvas_size ?? 2000, show_grid !== undefined ? (show_grid ? 1 : 0) : 1, grid_divisions ?? 200)

  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  res.status(201).json(parseRow(row))
})

// ─── GET /api/models/:id ──────────────────────────────────
router.get('/models/:id', validate(schema.getModel), (req, res) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!row) { res.status(404).json({ error: '模型不存在' }); return }
  res.json(parseRow(row))
})

// ─── PUT /api/models/:id ──────────────────────────────────
router.put('/models/:id', validate(schema.updateModel), (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }

  const { name, description, location_lat, location_lng, city_name,
          date_time, scene_data, sort_order,
          canvas_size, show_grid, grid_divisions } = req.body

  const updates: string[] = []
  const values: any[] = []

  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (description !== undefined) { updates.push('description = ?'); values.push(description) }
  if (location_lat !== undefined) { updates.push('location_lat = ?'); values.push(location_lat) }
  if (location_lng !== undefined) { updates.push('location_lng = ?'); values.push(location_lng) }
  if (city_name !== undefined) { updates.push('city_name = ?'); values.push(city_name) }
  if (date_time !== undefined) { updates.push('date_time = ?'); values.push(date_time) }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order) }
  if (canvas_size !== undefined) { updates.push('canvas_size = ?'); values.push(canvas_size) }
  if (show_grid !== undefined) { updates.push('show_grid = ?'); values.push(show_grid ? 1 : 0) }
  if (grid_divisions !== undefined) { updates.push('grid_divisions = ?'); values.push(grid_divisions) }

  if (scene_data !== undefined) {
    const { str, count } = normalizeSceneData(scene_data)
    updates.push('scene_data = ?'); values.push(str)
    updates.push('building_count = ?'); values.push(count)
  }

  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的字段' }); return
  }

  updates.push("updated_at = datetime('now', 'localtime')")
  values.push(id)

  db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  res.json(parseRow(row))
})

// ─── POST /api/models/:id/copy ────────────────────────────
router.post('/models/:id/copy', validate(schema.getModel), (req, res) => {
  const { id } = req.params
  const existing: any = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }

  const targetDirId = req.body?.target_directory_id || existing.directory_id
  const targetDir = db.prepare('SELECT id FROM directories WHERE id = ?').get(targetDirId)
  if (!targetDir) { res.status(404).json({ error: '目标目录不存在' }); return }

  const newId = uuidv4()
  const newName = existing.name + ' 副本'

  db.prepare(`
    INSERT INTO models (id, directory_id, name, description, location_lat, location_lng,
                        city_name, date_time, building_count, scene_data, sort_order,
                        canvas_size, show_grid, grid_divisions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newId, targetDirId, newName, existing.description, existing.location_lat,
         existing.location_lng, existing.city_name, existing.date_time,
         existing.building_count, existing.scene_data, existing.sort_order,
         existing.canvas_size, existing.show_grid, existing.grid_divisions)

  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(newId)
  res.status(201).json(parseRow(row))
})

// ─── PUT /api/models/:id/move ─────────────────────────────
router.put('/models/:id/move', validate(schema.getModel), (req, res) => {
  const { id } = req.params
  const { target_directory_id } = req.body || {}
  if (!target_directory_id) { res.status(400).json({ error: '缺少 target_directory_id' }); return }

  const existing = db.prepare('SELECT id FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }

  const targetDir = db.prepare('SELECT id FROM directories WHERE id = ?').get(target_directory_id)
  if (!targetDir) { res.status(404).json({ error: '目标目录不存在' }); return }

  db.prepare(`UPDATE models SET directory_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`)
    .run(target_directory_id, id)

  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  res.json(parseRow(row))
})

// ─── DELETE /api/models/:id ───────────────────────────────
router.delete('/models/:id', validate(schema.deleteModel), (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }
  db.prepare('DELETE FROM models WHERE id = ?').run(id)
  res.json({ success: true })
})

export default router
