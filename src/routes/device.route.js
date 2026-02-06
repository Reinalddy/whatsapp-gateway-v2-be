import { Router } from 'express'
import * as DeviceController from '../controllers/device.controller.js'
import { createDeviceValidator } from '../validators/device.validator.js'

const router = Router()

// Create a new device (initialize session)
router.post('/', createDeviceValidator, DeviceController.createDevice)

// Get all devices for authenticated user
router.get('/', DeviceController.getDevices)

// Get a single device
router.get('/:id', DeviceController.getDevice)

// Get QR code for a device
router.get('/:id/qr', DeviceController.getDeviceQR)

// Delete a device
router.delete('/:id', DeviceController.deleteDevice)

// Reconnect a device
router.post('/:id/reconnect', DeviceController.reconnectDevice)

export default router
