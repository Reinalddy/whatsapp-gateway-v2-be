import { Router } from 'express'
import * as AuthController from '../controllers/auth.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const router = Router()

// Public routes
router.post('/register', AuthController.register)
router.post('/login', AuthController.login)

// Protected route - requires auth
router.get('/me', authMiddleware, AuthController.me)

export default router