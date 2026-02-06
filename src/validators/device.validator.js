import { body } from 'express-validator'

export const createDeviceValidator = [
    body('sessionName')
        .notEmpty()
        .withMessage('Session name is required')
        .isString()
        .withMessage('Session name must be a string')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Session name must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Session name can only contain letters, numbers, underscores, and hyphens')
]
