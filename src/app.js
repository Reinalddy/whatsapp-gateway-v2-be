import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'

const app = express()

app.use(cors())

// Increase body limit for base64 media uploads
// WhatsApp limits: Images ~16MB, Documents ~100MB
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.use('/api', routes)

export default app