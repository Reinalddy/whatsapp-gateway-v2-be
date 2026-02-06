import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import routes from './routes/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors())

// Increase body limit for base64 media uploads
// WhatsApp limits: Images ~16MB, Documents ~100MB
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Serve uploaded files statically
// Access files via: http://localhost:3001/uploads/image/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api', routes)

export default app