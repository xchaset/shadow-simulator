import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db.js'
import { validate } from '../middleware/validator.js'
import * as schema from '../schemas/directories.js'

const router = Router()

// GET /api/directories — list all
router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT d.*, COUNT(m.id) as model_count
    FROM directories d
    LEFT JOIN models m ON m.directory_id = d.id
    GROUP BY d.id
    ORDER BY d.sort_order ASC, d.created_at ASC
  `).all()
  res.json(rows)
})

// POST /api/directories — create
router.post('/', validate(schema.createDirectory), (req, res) => {
  const { name, description, sort_order } = req.body
  const id = uuidv4()
  db.prepare(`
    INSERT INTO directories (id, name, description, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(id, name, description, sort_order)

  const row = db.prepare('SELECT * FROM directories WHERE id = ?').get(id)
  res.status(201).json(row)
})

// PUT /api/directories/:id — update
router.put('/:id', validate(schema.updateDirectory), (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM directories WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: '目录不存在' })
    return
  }

  const { name, description, sort_order } = req.body
  const updates: string[] = []
  const values: any[] = []

  if (name !== undefined) { updates.push('name = ?'); values.push(name) }
  if (description !== undefined) { updates.push('description = ?'); values.push(description) }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order) }

  if (updates.length === 0) {
    res.status(400).json({ error: '没有需要更新的字段' })
    return
  }

  updates.push("updated_at = datetime('now', 'localtime')")
  values.push(id)

  db.prepare(`UPDATE directories SET ${updates.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM directories WHERE id = ?').get(id)
  res.json(row)
})

// DELETE /api/directories/:id — delete (cascade models)
router.delete('/:id', validate(schema.deleteDirectory), (req, res) => {
  const { id } = req.params
  const existing = db.prepare('SELECT * FROM directories WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: '目录不存在' })
    return
  }
  db.prepare('DELETE FROM directories WHERE id = ?').run(id)
  res.json({ success: true })
})

export default router
