import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Resolve uploads directory relative to this file, not the process CWD.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// multer will write to this folder; src/app.js serves the exact same folder under /uploads
const uploadDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR, 'receipts')
  : path.resolve('/tmp/uploads/receipts')


// Ensure parent directories exist. In some deployments, the computed path may not be creatable;
// allow override via UPLOADS_DIR (e.g., /tmp/uploads).
fs.mkdirSync(uploadDir, { recursive: true })


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      const err = new Error('Only image files are allowed (jpg, png, webp)')
      err.statusCode = 400
      cb(err)
    }
  }
})


export default upload