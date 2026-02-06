import * as MessageService from '../services/message.service.js'
import { validationResult } from 'express-validator'

/**
 * Send a message via WhatsApp
 */
export const sendMessage = async (req, res) => {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({
                code: 400,
                message: 'Validation failed',
                errors: errors.array()
            })
        }

        const userId = req.user.id
        const { deviceId, to, type, message, mediaBase64, filename, caption, mimetype } = req.body

        const result = await MessageService.sendMessage(userId, deviceId, to, type, {
            message,
            mediaBase64,
            filename,
            caption,
            mimetype
        })

        if (result.error) {
            return res.status(result.code || 400).json({
                code: result.code || 400,
                message: result.message
            })
        }

        res.json({
            code: 200,
            message: 'Message sent successfully',
            data: {
                messageId: result.messageId
            }
        })
    } catch (error) {
        console.error('Send message error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to send message',
            error: error.message
        })
    }
}

/**
 * Check if device can send messages
 */
export const checkDevice = async (req, res) => {
    try {
        const userId = req.user.id
        const deviceId = parseInt(req.params.deviceId)

        if (isNaN(deviceId)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid device ID'
            })
        }

        const result = await MessageService.canSendMessage(userId, deviceId)

        res.json({
            code: 200,
            message: result.canSend ? 'Device is ready to send messages' : result.reason,
            data: {
                canSend: result.canSend,
                reason: result.reason || null
            }
        })
    } catch (error) {
        console.error('Check device error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to check device status',
            error: error.message
        })
    }
}
