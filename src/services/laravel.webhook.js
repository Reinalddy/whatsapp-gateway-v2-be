import { LARAVEL_WEBHOOK_URL, LARAVEL_WEBHOOK_SECRET } from '../config/env.js'

/**
 * Laravel Webhook Service
 * Forwards incoming WhatsApp messages to the Laravel backend
 */
class LaravelWebhookService {
    constructor() {
        this.webhookUrl = LARAVEL_WEBHOOK_URL
        this.webhookSecret = LARAVEL_WEBHOOK_SECRET
    }

    /**
     * Send incoming message to Laravel backend
     * @param {Object} messageData - The message data to forward
     * @returns {Promise<Object>} Response from Laravel
     */
    async forwardIncomingMessage(messageData) {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': this.webhookSecret,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(messageData)
            })

            const data = await response.json()

            if (!response.ok) {
                console.error('[LaravelWebhook] Error response:', data)
                return { success: false, error: data.message || 'Unknown error' }
            }

            console.log('[LaravelWebhook] Message forwarded successfully:', data)
            return { success: true, data }
        } catch (error) {
            console.error('[LaravelWebhook] Failed to forward message:', error.message)
            return { success: false, error: error.message }
        }
    }

    /**
     * Format incoming WhatsApp message for Laravel
     * @param {Object} message - Raw Baileys message object
     * @param {string} sessionName - The session that received the message
     * @returns {Object} Formatted message for Laravel webhook
     */
    formatMessage(message, sessionName) {
        const key = message.key
        const msg = message.message

        // Extract phone number from JID (remove @s.whatsapp.net)
        const phone = key.remoteJidAlt?.replace('@s.whatsapp.net', '') || ''

        // Get push name (contact name)
        const name = message.pushName || null

        // Determine message type and content
        let type = 'text'
        let content = null
        let filePath = null
        let fileName = null

        if (msg?.conversation) {
            type = 'text'
            content = msg.conversation
        } else if (msg?.extendedTextMessage?.text) {
            type = 'text'
            content = msg.extendedTextMessage.text
        } else if (msg?.imageMessage) {
            type = 'image'
            content = msg.imageMessage.caption || null
            // Note: File handling would need to be implemented separately
        } else if (msg?.documentMessage) {
            type = 'document'
            fileName = msg.documentMessage.fileName || 'document'
            content = msg.documentMessage.caption || null
        } else if (msg?.videoMessage) {
            type = 'video'
            content = msg.videoMessage.caption || null
        } else if (msg?.audioMessage) {
            type = 'audio'
        }

        return {
            phone,
            name,
            type,
            content,
            file_path: filePath,
            file_name: fileName,
            message_id: key.id,
            session_name: sessionName,
            timestamp: new Date().toISOString()
        }
    }

    /**
     * Process and forward an incoming message
     * @param {Object} message - Raw Baileys message object
     * @param {string} sessionName - The session that received the message
     */
    async processIncomingMessage(message, sessionName) {
        // Skip outgoing messages (fromMe = true)
        if (message.key.fromMe) {
            return { skipped: true, reason: 'Outgoing message' }
        }

        // Skip group messages (for now, only handle direct messages)
        if (message.key.remoteJid?.endsWith('@g.us')) {
            return { skipped: true, reason: 'Group message' }
        }

        // Skip status broadcasts
        if (message.key.remoteJid === 'status@broadcast') {
            return { skipped: true, reason: 'Status broadcast' }
        }

        // Format and forward the message
        const formattedMessage = this.formatMessage(message, sessionName)

        console.log('[LaravelWebhook] Processing incoming message:', {
            phone: formattedMessage.phone,
            type: formattedMessage.type,
            session: sessionName
        })

        return await this.forwardIncomingMessage(formattedMessage)
    }
}

// Export singleton instance
export const laravelWebhookService = new LaravelWebhookService()
export default laravelWebhookService
