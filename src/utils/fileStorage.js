import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Uploads directory
const UPLOADS_DIR = path.join(__dirname, '../../uploads')

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

/**
 * Save base64 file to disk
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} filename - Original filename
 * @param {string} type - File type (image/document)
 * @returns {object} - File info including path and URL
 */
export const saveBase64File = (base64Data, filename, type = 'document') => {
    // Generate unique filename
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(filename) || getExtensionFromBase64(base64Data)
    const uniqueFilename = `${timestamp}_${randomId}${ext}`

    // Create subdirectory based on type
    const subDir = path.join(UPLOADS_DIR, type)
    if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true })
    }

    const filePath = path.join(subDir, uniqueFilename)

    // Convert base64 to buffer and save
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, buffer)

    // Return relative path for storage in DB
    const relativePath = `/uploads/${type}/${uniqueFilename}`

    return {
        filename: uniqueFilename,
        originalFilename: filename,
        path: relativePath,
        absolutePath: filePath,
        size: buffer.length,
        type
    }
}

/**
 * Get file extension from base64 data
 */
const getExtensionFromBase64 = (base64Data) => {
    // Check magic bytes for common formats
    const signatures = {
        '/9j/': '.jpg',
        'iVBORw': '.png',
        'R0lGOD': '.gif',
        'UklGR': '.webp',
        'JVBERi': '.pdf',
        'UEsDBB': '.docx', // Also xlsx, pptx
        '0M8R4K': '.doc',
    }

    for (const [sig, ext] of Object.entries(signatures)) {
        if (base64Data.startsWith(sig)) {
            return ext
        }
    }

    return '.bin'
}

/**
 * Delete a file from uploads
 */
export const deleteFile = (relativePath) => {
    const absolutePath = path.join(__dirname, '../..', relativePath)
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
        return true
    }
    return false
}

/**
 * Get file as buffer
 */
export const getFileBuffer = (relativePath) => {
    const absolutePath = path.join(__dirname, '../..', relativePath)
    if (fs.existsSync(absolutePath)) {
        return fs.readFileSync(absolutePath)
    }
    return null
}

/**
 * Get file as base64
 */
export const getFileBase64 = (relativePath) => {
    const buffer = getFileBuffer(relativePath)
    if (buffer) {
        return buffer.toString('base64')
    }
    return null
}
