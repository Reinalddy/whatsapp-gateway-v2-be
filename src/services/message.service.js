import prisma from '../config/database.js'
import whatsappManager from './whatsapp.manager.js'
import { saveBase64File } from '../utils/fileStorage.js'
import { downloadMediaMessage } from 'baileys'

/**
 * Send a message via WhatsApp and record it in the database
 */
export const sendMessage = async (userId, deviceId, to, type, options = {}) => {
    // Get device and verify ownership
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            userId
        }
    })

    if (!device) {
        return {
            error: true,
            message: 'Device not found',
            code: 404
        }
    }

    // Check if device is connected
    if (!whatsappManager.isConnected(device.sessionName)) {
        return {
            error: true,
            message: 'Device is not connected. Please scan QR code first.',
            code: 400
        }
    }

    // Save media file if present
    let savedFile = null
    if (options.mediaBase64 && (type === 'image' || type === 'document')) {
        const filename = options.filename || `${type}_${Date.now()}`
        savedFile = saveBase64File(options.mediaBase64, filename, type)
    }

    try {
        // Create message record in database (pending status)
        const messageRecord = await prisma.message.create({
            data: {
                userId: userId,
                deviceId: device.id,
                to: to,
                type: type,
                content: type === 'text' ? options.message : null,
                mediaUrl: savedFile?.path || null,
                filename: savedFile?.originalFilename || options.filename || null,
                caption: options.caption || null,
                status: 'pending'
            }
        })
        let result

        switch (type) {
            case 'text':
                result = await whatsappManager.sendTextMessage(
                    device.sessionName,
                    to,
                    options.message
                )
                break

            case 'image':
                result = await whatsappManager.sendImageMessage(
                    device.sessionName,
                    to,
                    options.mediaBase64,
                    options.caption || ''
                )
                break

            case 'document':
                result = await whatsappManager.sendDocumentMessage(
                    device.sessionName,
                    to,
                    options.mediaBase64,
                    options.filename,
                    options.mimetype || 'application/pdf'
                )
                break

            default:
                // Update message as failed
                await prisma.message.update({
                    where: { id: messageRecord.id },
                    data: { status: 'failed', errorMsg: 'Invalid message type' }
                })
                return {
                    error: true,
                    message: 'Invalid message type',
                    code: 400
                }
        }

        // Update message as sent
        await prisma.message.update({
            where: { id: messageRecord.id },
            data: {
                status: 'sent',
                messageId: result.messageId
            }
        })

        return {
            error: false,
            ...result,
            dbMessageId: messageRecord.id,
            mediaUrl: savedFile?.path || null
        }
    } catch (error) {
        console.error('Send message error:', error)

        // Update message as failed
        await prisma.message.update({
            where: { id: messageRecord.id },
            data: {
                status: 'failed',
                errorMsg: error.message || 'Unknown error'
            }
        })

        return {
            error: true,
            message: error.message || 'Failed to send message',
            code: 500
        }
    }
}

/**
 * Check if a device can send messages
 */
export const canSendMessage = async (userId, deviceId) => {
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            userId
        }
    })

    if (!device) {
        return { canSend: false, reason: 'Device not found' }
    }

    if (!whatsappManager.isConnected(device.sessionName)) {
        return { canSend: false, reason: 'Device not connected' }
    }

    return { canSend: true, device }
}

/**
 * Get message history for a device
 */
export const getMessageHistory = async (userId, deviceId, options = {}) => {
    const { limit = 50, offset = 0, status } = options

    // Verify device ownership
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            userId
        }
    })

    if (!device) {
        return { error: true, message: 'Device not found' }
    }

    const where = { deviceId: device.id }
    if (status) {
        where.status = status
    }

    const [messages, total] = await Promise.all([
        prisma.message.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.message.count({ where })
    ])

    return {
        error: false,
        messages,
        total,
        limit,
        offset
    }
}

/**
 * Get all messages for a user (across all devices)
 */
export const getAllUserMessages = async (userId, options = {}) => {
    const { limit = 50, offset = 0, status } = options

    // Query directly by userId (now that Message has userId)
    const where = { userId }
    if (status) {
        where.status = status
    }

    const [messages, total] = await Promise.all([
        prisma.message.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                device: {
                    select: { sessionName: true }
                }
            }
        }),
        prisma.message.count({ where })
    ])

    return {
        error: false,
        messages,
        total,
        limit,
        offset
    }
}

/**
 * Save incoming message from WhatsApp
 */
export const saveIncomingMessage = async (userId, deviceId, message) => {
    try {
        const msg = message.message
        if (!msg) return

        // Determine message type
        let type = 'text'
        let content = null
        if (msg.conversation) {
            type = 'text'
            content = msg.conversation
        } else if (msg.extendedTextMessage) {
            type = 'text'
            content = msg.extendedTextMessage.text
        } else if (msg.imageMessage) {
            type = 'image'
            content = msg.imageMessage.caption
        } else if (msg.documentMessage) {
            type = 'document'
            content = msg.documentMessage.caption
        } else if (msg.videoMessage) {
            type = 'video'
            content = msg.videoMessage.caption
        } else if (msg.audioMessage) {
            type = 'audio'
        }

        // Handle media download
        let savedFile = null
        if (type === 'image' || type === 'document' || type === 'video' || type === 'audio') {
            try {
                // Download media buffer
                // Note: using direct downloadMediaMessage from baileys
                const buffer = await downloadMediaMessage(
                    message,
                    'buffer',
                    {},
                    {
                        // logger: console, // optional
                        // reuploadRequest: update => ... 
                    }
                )

                if (buffer) {
                    const base64 = buffer.toString('base64')
                    let filename = `incoming_${Date.now()}`

                    if (type === 'document' && msg.documentMessage) {
                        filename = msg.documentMessage.fileName || filename
                    }

                    savedFile = saveBase64File(base64, filename, type)
                }
            } catch (error) {
                console.error('Failed to download media:', error)
            }
        }

        // Extract sender info
        let from = message.key.remoteJidAlt
        if (from) {
            from = from.split('@')[0]
        }

        console.log(from, "from save message");
        // Save to database
        await prisma.message.create({
            data: {
                userId,
                deviceId,
                to: 'me',
                from: from,
                direction: 'inbound',
                type,
                content,
                mediaUrl: savedFile?.path || null,
                filename: savedFile?.originalFilename || null,
                caption: content,
                messageId: message.key.id,
                status: 'delivered'
            }
        })

        console.log(`Saved incoming ${type} message from ${from}`)

    } catch (error) {
        console.error('Error saving incoming message:', error)
    }
}
