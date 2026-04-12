import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'

const router = Router()

// GET /api/directories/:dirId/models — list models in directory
router.get('/directories/:dirId/models', (req, res) => {
  const { dirId } = req.params
  const rows = db.prepare(`
    SELECT id, directory_id, name, description, location_lat, location_lng,
           city_name, date_time, building_count, sort_order, created_at, updated_at
    FROM models
    WHERE directory_id = ?
    ORDER BY sort_order ASC, created_at ASC
  `).all(dirId)
  res.json(rows)
})

// POST /api/directories/:dirId/models — create model in directory
router.post('/directories/:dirId/models', (req, res) => {
  const { dirId } = req.params

  // Check directory exists
  const dir = db.prepare('SELECT id FROM directories WHERE id = ?').get(dirId)
  if (!dir) {
    res.status(404).json({ error: '目录不存在' })
    return
  }

  const {
    name,
    description = '',
    location_lat = 39.9042,
    location_lng = 116.4074,
    city_name = '北京',
    date_time,
    scene_data = '[]',
    sort_order = 0,
  } = req.body

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: '模型名称不能为空' })
    return
  }

  // Calculate building_count from scene_data
  let buildingCount = 0
  try {
    const buildings = JSON.parse(scene_data)
    buildingCount = Array.isArray(buildings) ? buildings.length : 0
  } catch { /* keep 0 */ }

  const id = uuidv4()
  const dt = date_time || new Date().toISOString()

  db.prepare(`
    INSERT INTO models (id, directory_id, name, description, location_lat, location_lng,
                        city_name, date_time, building_count, scene_data, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, dirId, name.trim(), description, location_lat, location_lng,
         city_name, dt, buildingCount, scene_data, sort_order)

  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  res.status(201).json(row)
})

// GET /api/models/:id — get full model with scene_data
router.get('/models/:id', (req, res) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!row) {
    res.status(404).json({ error: '模型不存在' })
    return
  }
  res.json(row)
})

// PUT /api/models/:id — update model
router.put('/models/:id', (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: '模型不存在' })
    return
  }

  const { name, description, location_lat, location_lng, city_name,
          date_time, scene_data, sort_order } = req.body

  const updates: string[] = []
  const values: any[] = []

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: '模型名称不能为空' })
      return
    }
    updates.push('name = ?')
    values.push(name.trim())
  }
  if (description !== undefined) { updates.push('description = ?'); values.push(description) }
  if (location_lat !== undefined) { updates.push('location_lat = ?'); values.push(location_lat) }
  if (location_lng !== undefined) { updates.push('location_lng = ?'); values.push(location_lng) }
  if (city_name !== undefined) { updates.push('city_name = ?'); values.push(city_name) }
  if (date_time !== undefined) { updates.push('date_time = ?'); values.push(date_time) }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order) }

  if (scene_data !== undefined) {
    updates.push('scene_data = ?')
    values.push(scene_data)
    // Update building_count
    let buildingCount = 0
    try {
      const buildings = JSON.parse(scene_data)
      buildingCount = Array.isArray(buildings) ? buildings.length : 0
    } catch { /* keep 0 */ }
    updates.push('building_count = ?')
    values.push(buildingCount)
  }

  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的字段' })
    return
  }

  updates.push("updated_at = datetime('now', 'localtime')")
  values.push(id)

  db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  res.json(row)
})

// DELETE /api/models/:id — delete model
router.delete('/models/:id', (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: '模型不存在' })
    return
  }
  db.prepare('DELETE FROM models WHERE id = ?').run(id)
  res.json({ success: true })
})

export default router
