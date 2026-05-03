import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { validate } from '../middleware/validator.js'
import * as schema from '../schemas/customTemplates.js'

const router = Router()

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

// ─── GET /api/custom-templates ──────────────────────────────────
router.get('/custom-templates', validate(schema.listCustomTemplates), (req, res) => {
  const { category } = req.query
  let query = `
    SELECT id, name, description, category, icon, source_model_ids, buildings, sort_order, created_at, updated_at
    FROM custom_templates
  `
  const params: any[] = []
  
  if (category) {
    query += ' WHERE category = ?'
    params.push(category)
  }
  query += ' ORDER BY sort_order ASC, created_at ASC'
  
  const rows = db.prepare(query).all(...params)
  res.json(rows.map(parseTemplateRow))
})

// ─── GET /api/custom-templates/categories ───────────────────────
router.get('/custom-templates/categories', (_req, res) => {
  const rows = db.prepare(`
    SELECT DISTINCT category
    FROM custom_templates
    ORDER BY category ASC
  `).all() as any[]
  const categories = rows.map(r => r.category)
  res.json(categories)
})

// ─── GET /api/custom-templates/:id ──────────────────────────────
router.get('/custom-templates/:id', validate(schema.getCustomTemplate), (req, res) => {
  const { id } = req.params
  const row = db.prepare(`
    SELECT id, name, description, category, icon, source_model_ids, buildings, sort_order, created_at, updated_at
    FROM custom_templates
    WHERE id = ?
  `).get(id)
  
  if (!row) {
    res.status(404).json({ error: '自定义模板不存在' })
    return
  }
  res.json(parseTemplateRow(row))
})

// ─── POST /api/custom-templates ─────────────────────────────────
router.post('/custom-templates', validate(schema.createCustomTemplate), (req, res) => {
  const {
    name, description, category, icon, source_model_ids, buildings, sort_order,
  } = req.body
  
  const id = uuidv4()
  const buildingsStr = JSON.stringify(buildings || [])
  const sourceModelIdsStr = JSON.stringify(source_model_ids || [])
  
  db.prepare(`
    INSERT INTO custom_templates (
      id, name, description, category, icon, source_model_ids, buildings, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    description || '',
    category || '自定义模板',
    icon || 'custom',
    sourceModelIdsStr,
    buildingsStr,
    sort_order ?? 0,
  )
  
  const row = db.prepare(`
    SELECT id, name, description, category, icon, source_model_ids, buildings, sort_order, created_at, updated_at
    FROM custom_templates
    WHERE id = ?
  `).get(id)
  
  res.status(201).json(parseTemplateRow(row))
})

// ─── PUT /api/custom-templates/:id ──────────────────────────────
router.put('/custom-templates/:id', validate(schema.updateCustomTemplate), (req, res) => {
  const { id } = req.params
  const { name, description, category, icon, buildings, sort_order } = req.body
  
  const existing = db.prepare('SELECT id FROM custom_templates WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: '自定义模板不存在' })
    return
  }
  
  const updates: string[] = []
  const values: any[] = []
  
  if (name !== undefined) {
    updates.push('name = ?'); values.push(name)
  }
  if (description !== undefined) {
    updates.push('description = ?'); values.push(description)
  }
  if (category !== undefined) {
    updates.push('category = ?'); values.push(category)
  }
  if (icon !== undefined) {
    updates.push('icon = ?'); values.push(icon)
  }
  if (buildings !== undefined) {
    updates.push('buildings = ?'); values.push(JSON.stringify(buildings))
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?'); values.push(sort_order)
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的字段' })
    return
  }
  
  updates.push("updated_at = datetime('now', 'localtime')")
  values.push(id)
  
  db.prepare(`UPDATE custom_templates SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  
  const row = db.prepare(`
    SELECT id, name, description, category, icon, source_model_ids, buildings, sort_order, created_at, updated_at
    FROM custom_templates
    WHERE id = ?
  `).get(id)
  
  res.json(parseTemplateRow(row))
})

// ─── DELETE /api/custom-templates/:id ───────────────────────────
router.delete('/custom-templates/:id', validate(schema.deleteCustomTemplate), (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT id FROM custom_templates WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: '自定义模板不存在' })
    return
  }
  
  db.prepare('DELETE FROM custom_templates WHERE id = ?').run(id)
  res.json({ success: true })
})

export default router
