import { makeWASocket, useMultiFileAuthState, DisconnectReason } from 'baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Sessions directory
const SESSIONS_DIR = path.join(__dirname, '../../sessions')

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

class WhatsAppSessionManager {
    constructor() {
        this.sessions = new Map()
        this.qrCodes = new Map()
        this.io = null
    }

    /**
     * Set the Socket.IO instance for real-time events
     */
    setSocketIO(io) {
        this.io = io
    }

    /**
     * Get session directory path for a given session
     */
    getSessionDir(sessionName) {
        return path.join(SESSIONS_DIR, sessionName)
    }

    /**
     * Initialize a new WhatsApp session
     */
    async initSession(sessionName, userId) {
        // Check if session already exists
        if (this.sessions.has(sessionName)) {
            const existingSession = this.sessions.get(sessionName)
            return {
                success: true,
                alreadyConnected: existingSession.isConnected,
                qr: this.qrCodes.get(sessionName) || null
            }
        }

        const sessionDir = this.getSessionDir(sessionName)

        try {
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

            const socket = makeWASocket({
                auth: state,
                browser: ['WhatsApp Gateway', 'Chrome', '1.0.0'],
                syncFullHistory: false,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                retryRequestDelayMs: 2000
            })

            // Store session info
            this.sessions.set(sessionName, {
                socket,
                userId,
                isConnected: false,
                phoneNumber: null
            })

            // Handle connection updates
            socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update

                if (qr) {
                    // Store QR and emit via Socket.IO
                    this.qrCodes.set(sessionName, qr)
                    if (this.io) {
                        this.io.to(`session:${sessionName}`).emit('qr', {
                            sessionName,
                            qr
                        })
                    }
                    console.log(`[${sessionName}] QR code generated`)
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut

                    console.log(`[${sessionName}] Connection closed. Reconnect: ${shouldReconnect}`)

                    // Update session state
                    const session = this.sessions.get(sessionName)
                    if (session) {
                        session.isConnected = false
                    }

                    // Emit disconnection event
                    if (this.io) {
                        this.io.to(`session:${sessionName}`).emit('connection', {
                            sessionName,
                            status: 'disconnected',
                            shouldReconnect
                        })
                    }

                    if (shouldReconnect) {
                        // Clean up old socket before reconnecting
                        this.sessions.delete(sessionName)

                        // Reconnect after a longer delay
                        setTimeout(() => {
                            console.log(`[${sessionName}] Attempting reconnection...`)
                            this.initSession(sessionName, userId)
                        }, 5000)
                    } else {
                        // Session logged out, clean up
                        this.removeSession(sessionName)
                    }
                }

                if (connection === 'open') {
                    console.log(`[${sessionName}] Connected successfully`)

                    // Update session state
                    const session = this.sessions.get(sessionName)
                    if (session) {
                        session.isConnected = true
                        // Get phone number from socket
                        const phoneNumber = socket.user?.id?.split(':')[0] || null
                        session.phoneNumber = phoneNumber
                    }

                    // Clear QR code
                    this.qrCodes.delete(sessionName)

                    // Emit connection event
                    if (this.io) {
                        this.io.to(`session:${sessionName}`).emit('connection', {
                            sessionName,
                            status: 'connected',
                            phoneNumber: session?.phoneNumber
                        })
                    }
                }
            })

            // Save credentials on update
            socket.ev.on('creds.update', saveCreds)

            return {
                success: true,
                alreadyConnected: false,
                qr: null
            }

        } catch (error) {
            console.error(`[${sessionName}] Error initializing session:`, error)
            throw error
        }
    }

    /**
     * Get an active session
     */
    getSession(sessionName) {
        return this.sessions.get(sessionName)
    }

    /**
     * Check if a session is connected
     */
    isConnected(sessionName) {
        const session = this.sessions.get(sessionName)
        return session?.isConnected || false
    }

    /**
     * Get current QR code for a session
     */
    getQR(sessionName) {
        return this.qrCodes.get(sessionName) || null
    }

    /**
     * Remove a session
     */
    async removeSession(sessionName) {
        const session = this.sessions.get(sessionName)

        if (session) {
            try {
                // Close the socket
                await session.socket.logout()
            } catch (error) {
                console.log(`[${sessionName}] Error during logout:`, error.message)
            }

            // Remove from maps
            this.sessions.delete(sessionName)
            this.qrCodes.delete(sessionName)
        }

        // Optionally remove session files
        const sessionDir = this.getSessionDir(sessionName)
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true })
        }

        console.log(`[${sessionName}] Session removed`)
    }

    /**
     * Format phone number for WhatsApp
     */
    formatPhoneNumber(phoneNumber) {
        // Remove any non-numeric characters
        let cleaned = phoneNumber.replace(/\D/g, '')

        // Add @s.whatsapp.net suffix
        return `${cleaned}@s.whatsapp.net`
    }

    /**
     * Send a text message
     */
    async sendTextMessage(sessionName, to, text) {
        const session = this.getSession(sessionName)

        if (!session || !session.isConnected) {
            throw new Error('Session not connected')
        }

        const jid = this.formatPhoneNumber(to)

        try {
            const result = await session.socket.sendMessage(jid, { text })
            return { success: true, messageId: result.key.id }
        } catch (error) {
            console.error(`[${sessionName}] Error sending text:`, error)
            throw error
        }
    }

    /**
     * Send an image message
     */
    async sendImageMessage(sessionName, to, imageBase64, caption = '') {
        const session = this.getSession(sessionName)

        if (!session || !session.isConnected) {
            throw new Error('Session not connected')
        }

        const jid = this.formatPhoneNumber(to)

        // Convert base64 to buffer
        const buffer = Buffer.from(imageBase64, 'base64')

        try {
            const result = await session.socket.sendMessage(jid, {
                image: buffer,
                caption: caption
            })
            return { success: true, messageId: result.key.id }
        } catch (error) {
            console.error(`[${sessionName}] Error sending image:`, error)
            throw error
        }
    }

    /**
     * Send a document message
     */
    async sendDocumentMessage(sessionName, to, documentBase64, filename, mimetype = 'application/pdf') {
        const session = this.getSession(sessionName)

        if (!session || !session.isConnected) {
            throw new Error('Session not connected')
        }

        const jid = this.formatPhoneNumber(to)

        // Convert base64 to buffer
        const buffer = Buffer.from(documentBase64, 'base64')

        try {
            const result = await session.socket.sendMessage(jid, {
                document: buffer,
                mimetype: mimetype,
                fileName: filename
            })
            return { success: true, messageId: result.key.id }
        } catch (error) {
            console.error(`[${sessionName}] Error sending document:`, error)
            throw error
        }
    }

    /**
     * Restore all sessions from the sessions directory
     */
    async restoreAllSessions(prisma) {
        console.log('Restoring all WhatsApp sessions...')

        try {
            // Get all devices from database
            const devices = await prisma.device.findMany({
                where: {
                    status: { not: 'disconnected' }
                }
            })

            for (const device of devices) {
                const sessionDir = this.getSessionDir(device.sessionName)

                // Check if session files exist
                if (fs.existsSync(sessionDir)) {
                    console.log(`Restoring session: ${device.sessionName}`)
                    try {
                        await this.initSession(device.sessionName, device.userId)
                    } catch (error) {
                        console.error(`Failed to restore session ${device.sessionName}:`, error.message)
                    }
                }
            }

            console.log('Session restoration complete')
        } catch (error) {
            console.error('Error restoring sessions:', error)
        }
    }

    /**
     * Get all active session names
     */
    getActiveSessions() {
        return Array.from(this.sessions.keys())
    }

    /**
     * Get session status
     */
    getSessionStatus(sessionName) {
        const session = this.sessions.get(sessionName)

        if (!session) {
            return 'not_found'
        }

        return session.isConnected ? 'connected' : 'pending'
    }
}

// Export singleton instance
export const whatsappManager = new WhatsAppSessionManager()
export default whatsappManager
