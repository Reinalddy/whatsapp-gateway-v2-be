import 'dotenv/config'
import { createServer } from 'http'
import { Server } from 'socket.io'
import app from './app.js'
import prisma from './config/database.js'
import whatsappManager from './services/whatsapp.manager.js'

const PORT = process.env.PORT || 3001

// Create HTTP server
const httpServer = createServer(app)

// Initialize Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    }
})

// Set Socket.IO instance on WhatsApp manager
whatsappManager.setSocketIO(io)

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Join a session room for real-time updates
    socket.on('join-session', (sessionName) => {
        socket.join(`session:${sessionName}`)
        console.log(`${socket.id} joined session room: ${sessionName}`)

        // Send current QR if available
        const qr = whatsappManager.getQR(sessionName)
        if (qr) {
            socket.emit('qr', { sessionName, qr })
        }

        // Send current connection status
        const status = whatsappManager.getSessionStatus(sessionName)
        socket.emit('connection', { sessionName, status })
    })

    // Leave a session room
    socket.on('leave-session', (sessionName) => {
        socket.leave(`session:${sessionName}`)
        console.log(`${socket.id} left session room: ${sessionName}`)
    })

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`)
    })
})

// Start server
httpServer.listen(PORT, async () => {
    console.log(`🚀 API running on port ${PORT}`)
    console.log(`📡 WebSocket server ready`)

    // Restore WhatsApp sessions on startup
    await whatsappManager.restoreAllSessions(prisma)
})

export { io }