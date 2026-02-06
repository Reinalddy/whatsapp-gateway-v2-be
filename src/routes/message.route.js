import { Router } from 'express'
import * as MessageController from '../controllers/message.controller.js'
import { sendMessageValidator } from '../validators/message.validator.js'

const router = Router()

// Send a message (text, image, or document)
router.post('/send-message', sendMessageValidator, MessageController.sendMessage)

// Check if a device can send messages
router.get('/check/:deviceId', MessageController.checkDevice)

export default router
