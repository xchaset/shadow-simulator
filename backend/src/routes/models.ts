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
  if (typeof row.terrain_data === 'string') {
    try {
      const parsed = JSON.parse(row.terrain_data)
      row.terrain_data = parsed
    } catch { row.terrain_data = null }
  }
  if (typeof row.lake_data === 'string') {
    try {
      const parsed = JSON.parse(row.lake_data)
      row.lake_data = parsed
    } catch { row.lake_data = null }
  }
  if (row.show_grid !== undefined && row.show_grid !== null) {
    row.show_grid = !!row.show_grid
  }
  return row
}

/** Serialize terrain data for storage */
function serializeTerrainData(terrain_data: any): string | null {
  if (!terrain_data || !terrain_data.heights) {
    return null
  }
  
  const toSerialize = {
    resolution: terrain_data.resolution,
    heights: Array.from(terrain_data.heights),
    maxHeight: terrain_data.maxHeight,
  }
  
  if (terrain_data.waterMask) {
    toSerialize.waterMask = Array.from(terrain_data.waterMask)
  }
  
  return JSON.stringify(toSerialize)
}

/** Serialize lake data for storage */
function serializeLakeData(lake_data: any): string | null {
  if (!lake_data) {
    return null
  }
  return JSON.stringify(lake_data)
}

/** Create a version snapshot for a model */
function createVersionSnapshot(modelId: string, modelData: any) {
  const versionId = uuidv4()
  
  // 获取下一个版本号
  const lastVersion = db.prepare(`
    SELECT version_number FROM model_versions 
    WHERE model_id = ? 
    ORDER BY version_number DESC 
    LIMIT 1
  `).get(modelId)
  
  const nextVersionNumber = lastVersion ? (lastVersion as any).version_number + 1 : 1
  
  db.prepare(`
    INSERT INTO model_versions (
      id, model_id, version_number, name, description, location_lat, location_lng,
      city_name, date_time, building_count, scene_data, canvas_size, show_grid,
      grid_divisions, thumbnail, terrain_data, lake_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    versionId,
    modelId,
    nextVersionNumber,
    modelData.name || '',
    modelData.description || '',
    modelData.location_lat ?? 39.9042,
    modelData.location_lng ?? 116.4074,
    modelData.city_name || '北京',
    modelData.date_time || new Date().toISOString(),
    modelData.building_count ?? 0,
    modelData.scene_data || '[]',
    modelData.canvas_size ?? 2000,
    modelData.show_grid !== undefined ? (modelData.show_grid ? 1 : 0) : 1,
    modelData.grid_divisions ?? 200,
    modelData.thumbnail || null,
    modelData.terrain_data || null,
    modelData.lake_data || null
  )
  
  return { version_id: versionId, version_number: nextVersionNumber }
}

/** Parse version row (similar to parseRow but for model_versions) */
function parseVersionRow(row: any) {
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
  if (typeof row.lake_data === 'string') {
    try {
      const parsed = JSON.parse(row.lake_data)
      row.lake_data = parsed
    } catch { row.lake_data = null }
  }
  if (row.show_grid !== undefined && row.show_grid !== null) {
    row.show_grid = !!row.show_grid
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
  // 列表接口不返回 terrain_data（数据量大），需要时由 get 接口获取
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
    canvas_size, show_grid, grid_divisions, terrain_data, lake_data,
  } = req.body

  const { str: sceneStr, count: buildingCount } = normalizeSceneData(scene_data)
  const id = uuidv4()
  const dt = date_time || new Date().toISOString()

  const terrainStr = serializeTerrainData(terrain_data)
  const lakeStr = serializeLakeData(lake_data)
  const showGridValue = show_grid !== undefined ? (show_grid ? 1 : 0) : 1

  db.prepare(`
    INSERT INTO models (id, directory_id, name, description, location_lat, location_lng,
                        city_name, date_time, building_count, scene_data, sort_order,
                        canvas_size, show_grid, grid_divisions, terrain_data, lake_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, dirId, name, description, location_lat, location_lng,
         city_name, dt, buildingCount, sceneStr, sort_order,
         canvas_size ?? 2000, showGridValue, grid_divisions ?? 200, terrainStr, lakeStr)

  createVersionSnapshot(id, {
    name,
    description,
    location_lat,
    location_lng,
    city_name,
    date_time: dt,
    building_count: buildingCount,
    scene_data: sceneStr,
    canvas_size: canvas_size ?? 2000,
    show_grid: showGridValue,
    grid_divisions: grid_divisions ?? 200,
    terrain_data: terrainStr,
    lake_data: lakeStr,
  })

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
  console.log('[models.ts] PUT /api/models/:id 被调用')
  console.log('[models.ts] req.body:', JSON.stringify({
    ...req.body,
    scene_data: req.body.scene_data ? `[${req.body.scene_data.length} items]` : 'undefined',
    terrain_data: req.body.terrain_data ? {
      resolution: req.body.terrain_data.resolution,
      heightsLength: req.body.terrain_data.heights?.length,
      maxHeight: req.body.terrain_data.maxHeight,
      heightsSample: req.body.terrain_data.heights?.slice(0, 5)
    } : 'null/undefined'
  }, null, 2))
  
  const { id } = req.params
  const existing: any = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!existing) { 
    console.log('[models.ts] 模型不存在:', id)
    res.status(404).json({ error: '模型不存在' }); return 
  }

  const { name, description, location_lat, location_lng, city_name,
          date_time, scene_data, sort_order,
          canvas_size, show_grid, grid_divisions, terrain_data, lake_data } = req.body

  const updates: string[] = []
  const values: any[] = []

  // 准备更新后的数据（用于创建快照）
  const updatedData = { ...existing }

  if (name !== undefined) {
    updates.push('name = ?'); values.push(name)
    updatedData.name = name
  }
  if (description !== undefined) {
    updates.push('description = ?'); values.push(description)
    updatedData.description = description
  }
  if (location_lat !== undefined) {
    updates.push('location_lat = ?'); values.push(location_lat)
    updatedData.location_lat = location_lat
  }
  if (location_lng !== undefined) {
    updates.push('location_lng = ?'); values.push(location_lng)
    updatedData.location_lng = location_lng
  }
  if (city_name !== undefined) {
    updates.push('city_name = ?'); values.push(city_name)
    updatedData.city_name = city_name
  }
  if (date_time !== undefined) {
    updates.push('date_time = ?'); values.push(date_time)
    updatedData.date_time = date_time
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?'); values.push(sort_order)
    updatedData.sort_order = sort_order
  }
  if (canvas_size !== undefined) {
    updates.push('canvas_size = ?'); values.push(canvas_size)
    updatedData.canvas_size = canvas_size
  }
  if (show_grid !== undefined) {
    const showGridValue = show_grid ? 1 : 0
    updates.push('show_grid = ?'); values.push(showGridValue)
    updatedData.show_grid = showGridValue
  }
  if (grid_divisions !== undefined) {
    updates.push('grid_divisions = ?'); values.push(grid_divisions)
    updatedData.grid_divisions = grid_divisions
  }

  let sceneStr: string | undefined
  let buildingCount: number | undefined
  if (scene_data !== undefined) {
    const { str, count } = normalizeSceneData(scene_data)
    updates.push('scene_data = ?'); values.push(str)
    updates.push('building_count = ?'); values.push(count)
    sceneStr = str
    buildingCount = count
    updatedData.scene_data = str
    updatedData.building_count = count
  }

  let terrainStr: string | null | undefined
  if (terrain_data !== undefined) {
    terrainStr = serializeTerrainData(terrain_data)
    updates.push('terrain_data = ?'); values.push(terrainStr)
    updatedData.terrain_data = terrainStr
  }

  let lakeStr: string | null | undefined
  if (lake_data !== undefined) {
    lakeStr = serializeLakeData(lake_data)
    updates.push('lake_data = ?'); values.push(lakeStr)
    updatedData.lake_data = lakeStr
  }

  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的字段' }); return
  }

  updates.push("updated_at = datetime('now', 'localtime')")
  values.push(id)

  db.prepare(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  
  // 创建版本快照
  createVersionSnapshot(id, updatedData)
  
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
                        canvas_size, show_grid, grid_divisions, terrain_data, lake_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newId, targetDirId, newName, existing.description, existing.location_lat,
         existing.location_lng, existing.city_name, existing.date_time,
         existing.building_count, existing.scene_data, existing.sort_order,
         existing.canvas_size, existing.show_grid, existing.grid_divisions, existing.terrain_data, existing.lake_data)

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

// ─── POST /api/recent-models/:id ──────────────────────────
router.post('/recent-models/:id', validate(schema.getModel), (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT id FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }

  // 删除旧的记录，插入新的（保持每个模型只有一条最近记录）
  db.prepare('DELETE FROM recent_models WHERE model_id = ?').run(id)
  db.prepare('INSERT INTO recent_models (model_id) VALUES (?)').run(id)
  res.json({ success: true })
})

// ─── GET /api/recent-models ───────────────────────────────
router.get('/recent-models', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50)
  console.log('[recent-models] GET limit:', limit)
  const rows = db.prepare(`
    SELECT m.id, m.directory_id, m.name, m.description, m.location_lat, m.location_lng,
           m.city_name, m.date_time, m.building_count, m.canvas_size, m.show_grid, m.grid_divisions,
           m.terrain_data, m.lake_data, m.sort_order, m.created_at, m.updated_at, rm.opened_at
    FROM recent_models rm
    JOIN models m ON m.id = rm.model_id
    ORDER BY rm.opened_at DESC
    LIMIT ?
  `).all(limit)
  console.log('[recent-models] found', rows.length, 'rows')
  res.json(rows.map(parseRow))
})

// ─── DELETE /api/recent-models/:id ────────────────────────
router.delete('/recent-models/:id', validate(schema.getModel), (req, res) => {
  const { id } = req.params
  db.prepare('DELETE FROM recent_models WHERE model_id = ?').run(id)
  res.json({ success: true })
})

// ─── GET /api/models/:id/versions ─────────────────────────
router.get('/models/:id/versions', validate(schema.getModel), (req, res) => {
  const { id } = req.params
  const limit = Math.min(Number(req.query.limit) || 50, 100)
  
  const existing = db.prepare('SELECT id FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }
  
  const rows = db.prepare(`
    SELECT id, model_id, version_number, name, description, location_lat, location_lng,
           city_name, date_time, building_count, canvas_size, show_grid, grid_divisions,
           created_at
    FROM model_versions
    WHERE model_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(id, limit)
  
  res.json(rows.map(parseVersionRow))
})

// ─── GET /api/models/:id/versions/:versionId ──────────────
router.get('/models/:id/versions/:versionId', validate(schema.getVersion), (req, res) => {
  const { id, versionId } = req.params
  
  const existing = db.prepare('SELECT id FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }
  
  const row = db.prepare(`
    SELECT * FROM model_versions WHERE id = ? AND model_id = ?
  `).get(versionId, id)
  
  if (!row) { res.status(404).json({ error: '版本不存在' }); return }
  
  res.json(parseVersionRow(row))
})

// ─── POST /api/models/:id/versions/:versionId/restore ─────
router.post('/models/:id/versions/:versionId/restore', validate(schema.getVersion), (req, res) => {
  const { id, versionId } = req.params
  
  const existing: any = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }
  
  const version: any = db.prepare(`
    SELECT * FROM model_versions WHERE id = ? AND model_id = ?
  `).get(versionId, id)
  
  if (!version) { res.status(404).json({ error: '版本不存在' }); return }
  
  // 在回滚之前，先保存当前状态作为一个新版本
  createVersionSnapshot(id, existing)
  
  // 回滚到指定版本
  db.prepare(`
    UPDATE models SET
      name = ?, description = ?, location_lat = ?, location_lng = ?,
      city_name = ?, date_time = ?, building_count = ?, scene_data = ?,
      canvas_size = ?, show_grid = ?, grid_divisions = ?, terrain_data = ?, lake_data = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(
    version.name, version.description, version.location_lat, version.location_lng,
    version.city_name, version.date_time, version.building_count, version.scene_data,
    version.canvas_size, version.show_grid, version.grid_divisions, version.terrain_data, version.lake_data,
    id
  )
  
  const row = db.prepare('SELECT * FROM models WHERE id = ?').get(id)
  res.json(parseRow(row))
})

// ─── DELETE /api/models/:id/versions/:versionId ───────────
router.delete('/models/:id/versions/:versionId', validate(schema.getVersion), (req, res) => {
  const { id, versionId } = req.params
  
  const existing = db.prepare('SELECT id FROM models WHERE id = ?').get(id)
  if (!existing) { res.status(404).json({ error: '模型不存在' }); return }
  
  const version = db.prepare(`
    SELECT id FROM model_versions WHERE id = ? AND model_id = ?
  `).get(versionId, id)
  
  if (!version) { res.status(404).json({ error: '版本不存在' }); return }
  
  db.prepare('DELETE FROM model_versions WHERE id = ?').run(versionId)
  res.json({ success: true })
})

// ─── POST /api/models/merge ────────────────────────────────
router.post('/models/merge', validate(schema.mergeModels), (req, res) => {
  const {
    model_ids, name, description, target_directory_id,
    save_as_template, template_category,
  } = req.body
  
  // 验证所有模型都存在
  const placeholders = model_ids.map(() => '?').join(',')
  const models = db.prepare(`
    SELECT id, directory_id, name, description, location_lat, location_lng,
           city_name, date_time, building_count, scene_data, canvas_size,
           show_grid, grid_divisions, terrain_data, lake_data, sort_order
    FROM models
    WHERE id IN (${placeholders})
    ORDER BY created_at ASC
  `).all(...model_ids) as any[]
  
  if (models.length !== model_ids.length) {
    const foundIds = models.map(m => m.id)
    const missingIds = model_ids.filter((id: string) => !foundIds.includes(id))
    res.status(404).json({ error: '部分模型不存在', missing_ids: missingIds })
    return
  }
  
  // 合并建筑数据
  const allBuildings: any[] = []
  const usedIds = new Set<string>()
  
  for (const model of models) {
    let buildings: any[] = []
    if (typeof model.scene_data === 'string') {
      try { buildings = JSON.parse(model.scene_data) } catch { buildings = [] }
    } else if (Array.isArray(model.scene_data)) {
      buildings = model.scene_data
    }
    
    for (const building of buildings) {
      // 确保建筑ID唯一
      let buildingId = building.id
      if (usedIds.has(buildingId)) {
        buildingId = `building-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      }
      usedIds.add(buildingId)
      allBuildings.push({ ...building, id: buildingId })
    }
  }
  
  if (save_as_template) {
    // 保存为自定义模板
    const templateId = uuidv4()
    const buildingsStr = JSON.stringify(allBuildings)
    const sourceModelIdsStr = JSON.stringify(model_ids)
    
    db.prepare(`
      INSERT INTO custom_templates (
        id, name, description, category, icon, source_model_ids, buildings, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      templateId,
      name,
      description || '',
      template_category || '自定义模板',
      'custom',
      sourceModelIdsStr,
      buildingsStr,
      0,
    )
    
    const templateRow = db.prepare(`
      SELECT id, name, description, category, icon, source_model_ids, buildings, sort_order, created_at, updated_at
      FROM custom_templates
      WHERE id = ?
    `).get(templateId)
    
    function parseTemplateRow(row: any) {
      if (!row) return row
      if (typeof row.buildings === 'string') {
        try { row.buildings = JSON.parse(row.buildings) } catch { row.buildings = [] }
      }
      if (typeof row.source_model_ids === 'string') {
        try { row.source_model_ids = JSON.parse(row.source_model_ids) } catch { row.source_model_ids = [] }
      }
      return row
    }
    
    res.status(201).json({
      type: 'template',
      data: parseTemplateRow(templateRow),
    })
  } else {
    // 创建为新模型
    const targetDir = db.prepare('SELECT id FROM directories WHERE id = ?').get(target_directory_id)
    if (!targetDir) {
      res.status(404).json({ error: '目标目录不存在' })
      return
    }
    
    const newId = uuidv4()
    const { str: sceneStr, count: buildingCount } = normalizeSceneData(allBuildings)
    const dt = new Date().toISOString()
    
    // 使用第一个模型的设置作为基础
    const firstModel = models[0]
    const terrainStr = firstModel.terrain_data ? serializeTerrainData(
      typeof firstModel.terrain_data === 'string' 
        ? JSON.parse(firstModel.terrain_data) 
        : firstModel.terrain_data
    ) : null
    
    const lakeStr = firstModel.lake_data ? serializeLakeData(
      typeof firstModel.lake_data === 'string'
        ? JSON.parse(firstModel.lake_data)
        : firstModel.lake_data
    ) : null
    
    const showGridValue = firstModel.show_grid !== undefined 
      ? (firstModel.show_grid ? 1 : 0) 
      : 1
    
    db.prepare(`
      INSERT INTO models (
        id, directory_id, name, description, location_lat, location_lng,
        city_name, date_time, building_count, scene_data, sort_order,
        canvas_size, show_grid, grid_divisions, terrain_data, lake_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      target_directory_id,
      name,
      description || '',
      firstModel.location_lat ?? 39.9042,
      firstModel.location_lng ?? 116.4074,
      firstModel.city_name || '北京',
      dt,
      buildingCount,
      sceneStr,
      0,
      firstModel.canvas_size ?? 2000,
      showGridValue,
      firstModel.grid_divisions ?? 200,
      terrainStr,
      lakeStr,
    )
    
    createVersionSnapshot(newId, {
      name,
      description: description || '',
      location_lat: firstModel.location_lat ?? 39.9042,
      location_lng: firstModel.location_lng ?? 116.4074,
      city_name: firstModel.city_name || '北京',
      date_time: dt,
      building_count: buildingCount,
      scene_data: sceneStr,
      canvas_size: firstModel.canvas_size ?? 2000,
      show_grid: showGridValue,
      grid_divisions: firstModel.grid_divisions ?? 200,
      terrain_data: terrainStr,
      lake_data: lakeStr,
    })
    
    const row = db.prepare('SELECT * FROM models WHERE id = ?').get(newId)
    
    res.status(201).json({
      type: 'model',
      data: parseRow(row),
    })
  }
})

export default router
