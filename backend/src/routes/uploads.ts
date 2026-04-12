import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'glb')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'model/gltf-binary' || 
        file.mimetype === 'model/gltf+json' ||
        file.originalname.endsWith('.glb') ||
        file.originalname.endsWith('.gltf')) {
      cb(null, true)
    } else {
      cb(new Error('只支持 GLB/GLTF 文件'))
    }
  },
})

// POST /api/upload/glb - 上传 GLB 文件
router.post('/upload/glb', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '没有文件' })
    return
  }
  
  const fileUrl = `/uploads/glb/${req.file.filename}`
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
  })
})

// GET /uploads/glb/:filename - 下载 GLB 文件  
router.get('/uploads/glb/:filename', (req, res) => {
  const { filename } = req.params
  const filePath = path.join(UPLOAD_DIR, filename)
  
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: '文件不存在' })
    return
  }
  
  res.sendFile(filePath)
})

// DELETE /api/upload/glb/:filename - 删除 GLB 文件
router.delete('/uploads/glb/:filename', (req, res) => {
  const { filename } = req.params
  const filePath = path.join(UPLOAD_DIR, filename)
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  
  res.json({ success: true })
})

export default router