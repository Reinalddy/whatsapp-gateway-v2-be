import prisma from '../config/database.js'
import whatsappManager from './whatsapp.manager.js'
import { generateQRImage } from '../utils/qrcode.js'

/**
 * Create a new device and initialize WhatsApp session
 */
export const createDevice = async (userId, sessionName) => {
    // Check if session name already exists
    const existing = await prisma.device.findUnique({
        where: { sessionName }
    })

    if (existing) {
        return {
            error: true,
            message: 'Session name already exists'
        }
    }

    // Create device in database
    const device = await prisma.device.create({
        data: {
            userId,
            sessionName,
            status: 'pending'
        }
    })

    // Initialize WhatsApp session
    try {
        await whatsappManager.initSession(sessionName, userId, device.id)
    } catch (error) {
        // If session init fails, delete the device record
        await prisma.device.delete({ where: { id: device.id } })
        throw error
    }

    return {
        error: false,
        device
    }
}

/**
 * Get all devices for a user
 */
export const getDevices = async (userId) => {
    const devices = await prisma.device.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    })

    // Enrich with real-time status from manager
    return devices.map(device => ({
        ...device,
        liveStatus: whatsappManager.getSessionStatus(device.sessionName),
        isOnline: whatsappManager.isConnected(device.sessionName)
    }))
}

/**
 * Get a single device by ID
 */
export const getDevice = async (userId, deviceId) => {
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            userId
        }
    })

    if (!device) {
        return null
    }

    return {
        ...device,
        liveStatus: whatsappManager.getSessionStatus(device.sessionName),
        isOnline: whatsappManager.isConnected(device.sessionName),
        hasQR: !!whatsappManager.getQR(device.sessionName)
    }
}

/**
 * Get QR code for a device
 * @param {number} userId - User ID
 * @param {number} deviceId - Device ID
 * @param {string} format - 'image' for base64 data URL, 'raw' for raw string
 */
export const getDeviceQR = async (userId, deviceId, format = 'image') => {
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            userId
        }
    })

    if (!device) {
        return { error: true, message: 'Device not found' }
    }

    const qrString = whatsappManager.getQR(device.sessionName)
    const isConnected = whatsappManager.isConnected(device.sessionName)

    // If connected or no QR available, return status
    if (isConnected || !qrString) {
        return {
            error: false,
            sessionName: device.sessionName,
            qr: null,
            qrImage: null,
            isConnected
        }
    }

    // Generate QR image if format is 'image'
    let qrImage = null
    if (format === 'image' && qrString) {
        try {
            qrImage = await generateQRImage(qrString)
        } catch (error) {
            console.error('Failed to generate QR image:', error)
        }
    }

    return {
        error: false,
        sessionName: device.sessionName,
        qr: format === 'raw' ? qrString : null,
        qrImage: qrImage,
        isConnected
    }
}

/**
 * Delete a device and remove WhatsApp session
 */
export const deleteDevice = async (userId, deviceId) => {
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            userId
        }
    })

    if (!device) {
        return { error: true, message: 'Device not found' }
    }

    // Remove WhatsApp session
    await whatsappManager.removeSession(device.sessionName)

    // Delete from database
    await prisma.device.delete({
        where: { id: deviceId }
    })

    return { error: false, message: 'Device deleted successfully' }
}

/**
 * Update device status
 */
export const updateDeviceStatus = async (sessionName, status, phoneNumber = null) => {
    const updateData = { status }

    if (phoneNumber) {
        updateData.phoneNumber = phoneNumber
    }

    return prisma.device.update({
        where: { sessionName },
        data: updateData
    })
}

/**
 * Reconnect a device session
 */
export const reconnectDevice = async (userId, deviceId) => {
    const device = await prisma.device.findFirst({
        where: {
            id: deviceId,
            userId
        }
    })

    if (!device) {
        return { error: true, message: 'Device not found' }
    }

    // Try to initialize session
    try {
        await whatsappManager.initSession(device.sessionName, userId, device.id)
        return { error: false, message: 'Reconnection initiated' }
    } catch (error) {
        return { error: true, message: error.message }
    }
}
