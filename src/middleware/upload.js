import multer from 'multer'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', file.originalname)
    console.log('Mime type:', file.mimetype)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]
    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true)
    }
    const err = new Error(`Unsupported file type: ${file.mimetype}`)
    err.statusCode = 400
    return cb(err)
  }
})

export default upload