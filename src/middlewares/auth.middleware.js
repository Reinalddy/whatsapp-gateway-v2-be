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
                message: 'Access denied. No token provided.',
                hint: 'Include Authorization header with format: Bearer <token>'
            })
        }

        const token = authHeader.split(' ')[1]

        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({
                code: 401,
                message: 'Access denied. Invalid token format.',
                hint: 'Token is empty or null. Please login again.'
            })
        }

        // Basic JWT format check (3 parts separated by dots)
        const tokenParts = token.split('.')
        if (tokenParts.length !== 3) {
            return res.status(401).json({
                code: 401,
                message: 'Access denied. Malformed token.',
                hint: 'Token must be a valid JWT with 3 parts. Please login again.'
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

        // Provide specific error messages
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                code: 401,
                message: 'Access denied. Invalid token.',
                hint: 'Token signature is invalid. Please login again.'
            })
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                code: 401,
                message: 'Access denied. Token expired.',
                hint: 'Your session has expired. Please login again.'
            })
        }

        return res.status(401).json({
            code: 401,
            message: 'Access denied. Authentication failed.',
            error: error.message
        })
    }
}

export default authMiddleware
