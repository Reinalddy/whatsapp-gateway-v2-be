import prisma from '../config/database.js'
import whatsappManager from './whatsapp.manager.js'
import { saveBase64File } from '../utils/fileStorage.js'

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

    try {
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
