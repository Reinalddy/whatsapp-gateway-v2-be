import { verifyToken } from '../utils/jwt.js'
import prisma from '../config/database.js'

/**
 * JWT Authentication Middleware
 * Protects routes by requiring a valid JWT token
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                code: 401,
                message: 'Access denied. No token provided.'
            })
        }

        const token = authHeader.split(' ')[1]

        if (!token) {
            return res.status(401).json({
                code: 401,
                message: 'Access denied. Invalid token format.'
            })
        }

        // Verify the token
        const decoded = verifyToken(token)

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, name: true, email: true, phoneNumber: true }
        })

        if (!user) {
            return res.status(401).json({
                code: 401,
                message: 'Access denied. User not found.'
            })
        }

        // Attach user to request object
        req.user = user
        next()
    } catch (error) {
        console.error('Auth middleware error:', error.message)
        return res.status(401).json({
            code: 401,
            message: 'Access denied. Invalid or expired token.'
        })
    }
}

export default authMiddleware
