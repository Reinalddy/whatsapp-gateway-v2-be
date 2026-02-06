import { body } from 'express-validator'

export const sendMessageValidator = [
    body('deviceId')
        .notEmpty()
        .withMessage('Device ID is required')
        .isInt({ min: 1 })
        .withMessage('Device ID must be a positive integer'),

    body('to')
        .notEmpty()
        .withMessage('Recipient phone number is required')
        .isString()
        .withMessage('Phone number must be a string')
        .matches(/^[0-9]+$/)
        .withMessage('Phone number can only contain digits'),

    body('type')
        .notEmpty()
        .withMessage('Message type is required')
        .isIn(['text', 'image', 'document'])
        .withMessage('Message type must be text, image, or document'),

    body('message')
        .if(body('type').equals('text'))
        .notEmpty()
        .withMessage('Message content is required for text messages'),

    body('mediaBase64')
        .if(body('type').isIn(['image', 'document']))
        .notEmpty()
        .withMessage('Media base64 is required for image/document messages'),

    body('filename')
        .if(body('type').equals('document'))
        .notEmpty()
        .withMessage('Filename is required for document messages'),

    body('caption')
        .optional()
        .isString()
        .withMessage('Caption must be a string'),

    body('mimetype')
        .optional()
        .isString()
        .withMessage('Mimetype must be a string')
]
