import prisma from '../config/database.js'
import whatsappManager from './whatsapp.manager.js'

/**
 * Send a message via WhatsApp
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
                return {
                    error: true,
                    message: 'Invalid message type',
                    code: 400
                }
        }

        return {
            error: false,
            ...result
        }
    } catch (error) {
        console.error('Send message error:', error)
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
