import QRCode from 'qrcode'

/**
 * Convert QR string to base64 data URL image
 * @param {string} qrString - The QR code string from Baileys
 * @returns {Promise<string>} - Base64 data URL of the QR code image
 */
export const generateQRImage = async (qrString) => {
    try {
        const dataUrl = await QRCode.toDataURL(qrString, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        })
        return dataUrl
    } catch (error) {
        console.error('Error generating QR image:', error)
        throw error
    }
}

/**
 * Generate QR code as PNG buffer
 * @param {string} qrString - The QR code string from Baileys
 * @returns {Promise<Buffer>} - PNG buffer of the QR code image
 */
export const generateQRBuffer = async (qrString) => {
    try {
        const buffer = await QRCode.toBuffer(qrString, {
            errorCorrectionLevel: 'M',
            type: 'png',
            width: 300,
            margin: 2
        })
        return buffer
    } catch (error) {
        console.error('Error generating QR buffer:', error)
        throw error
    }
}
