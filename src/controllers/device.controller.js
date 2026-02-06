import * as DeviceService from '../services/device.service.js'
import { validationResult } from 'express-validator'

/**
 * Create a new device (initialize WhatsApp session)
 */
export const createDevice = async (req, res) => {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({
                code: 400,
                message: 'Validation failed',
                errors: errors.array()
            })
        }

        const { sessionName } = req.body
        const userId = req.user.id

        const result = await DeviceService.createDevice(userId, sessionName)

        if (result.error) {
            return res.status(400).json({
                code: 400,
                message: result.message
            })
        }

        res.status(201).json({
            code: 201,
            message: 'Device created. Connect via WebSocket to receive QR code.',
            data: result.device
        })
    } catch (error) {
        console.error('Create device error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to create device',
            error: error.message
        })
    }
}

/**
 * Get all devices for authenticated user
 */
export const getDevices = async (req, res) => {
    try {
        const userId = req.user.id
        const devices = await DeviceService.getDevices(userId)

        res.json({
            code: 200,
            message: 'Devices retrieved successfully',
            data: devices
        })
    } catch (error) {
        console.error('Get devices error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to retrieve devices',
            error: error.message
        })
    }
}

/**
 * Get a single device by ID
 */
export const getDevice = async (req, res) => {
    try {
        const userId = req.user.id
        const deviceId = parseInt(req.params.id)

        if (isNaN(deviceId)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid device ID'
            })
        }

        const device = await DeviceService.getDevice(userId, deviceId)

        if (!device) {
            return res.status(404).json({
                code: 404,
                message: 'Device not found'
            })
        }

        res.json({
            code: 200,
            message: 'Device retrieved successfully',
            data: device
        })
    } catch (error) {
        console.error('Get device error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to retrieve device',
            error: error.message
        })
    }
}

/**
 * Get QR code for a device
 * Supports query param ?format=raw for raw string, default returns image data URL
 */
export const getDeviceQR = async (req, res) => {
    try {
        const userId = req.user.id
        const deviceId = parseInt(req.params.id)
        const format = req.query.format || 'image' // 'image' or 'raw'

        if (isNaN(deviceId)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid device ID'
            })
        }

        const result = await DeviceService.getDeviceQR(userId, deviceId, format)

        if (result.error) {
            return res.status(404).json({
                code: 404,
                message: result.message
            })
        }

        if (result.isConnected) {
            return res.json({
                code: 200,
                message: 'Device is already connected',
                data: {
                    sessionName: result.sessionName,
                    isConnected: true,
                    qr: null,
                    qrImage: null
                }
            })
        }

        if (!result.qrImage && !result.qr) {
            return res.json({
                code: 200,
                message: 'QR code not yet available. Poll this endpoint or connect via WebSocket for real-time updates.',
                data: {
                    sessionName: result.sessionName,
                    isConnected: false,
                    qr: null,
                    qrImage: null
                }
            })
        }

        res.json({
            code: 200,
            message: 'QR code retrieved successfully',
            data: {
                sessionName: result.sessionName,
                isConnected: false,
                qr: result.qr,
                qrImage: result.qrImage // Base64 data URL, can be used directly in <img src="">
            }
        })
    } catch (error) {
        console.error('Get QR error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to retrieve QR code',
            error: error.message
        })
    }
}

/**
 * Delete a device
 */
export const deleteDevice = async (req, res) => {
    try {
        const userId = req.user.id
        const deviceId = parseInt(req.params.id)

        if (isNaN(deviceId)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid device ID'
            })
        }

        const result = await DeviceService.deleteDevice(userId, deviceId)

        if (result.error) {
            return res.status(404).json({
                code: 404,
                message: result.message
            })
        }

        res.json({
            code: 200,
            message: result.message
        })
    } catch (error) {
        console.error('Delete device error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to delete device',
            error: error.message
        })
    }
}

/**
 * Reconnect a device
 */
export const reconnectDevice = async (req, res) => {
    try {
        const userId = req.user.id
        const deviceId = parseInt(req.params.id)

        if (isNaN(deviceId)) {
            return res.status(400).json({
                code: 400,
                message: 'Invalid device ID'
            })
        }

        const result = await DeviceService.reconnectDevice(userId, deviceId)

        if (result.error) {
            return res.status(400).json({
                code: 400,
                message: result.message
            })
        }

        res.json({
            code: 200,
            message: result.message
        })
    } catch (error) {
        console.error('Reconnect device error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to reconnect device',
            error: error.message
        })
    }
}
