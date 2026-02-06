import { Router } from 'express'
import authRoute from './auth.route.js'
import deviceRoute from './device.route.js'
import messageRoute from './message.route.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const router = Router()

// Public routes (no auth required)
router.use('/auth', authRoute)

// Protected routes (require JWT authentication)
router.use('/devices', authMiddleware, deviceRoute)
router.use('/messages', authMiddleware, messageRoute)

export default router