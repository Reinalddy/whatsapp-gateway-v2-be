import prisma from '../config/database.js'

/**
 * Get all settings
 */
export const getSettings = async () => {
    const settings = await prisma.setting.findMany()
    // Convert array to object { key: value }
    return settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value
        return acc
    }, {})
}

/**
 * Get a single setting by key
 */
export const getSetting = async (key) => {
    const setting = await prisma.setting.findUnique({
        where: { key }
    })
    return setting ? setting.value : null
}

/**
 * Update or create a setting
 */
export const updateSetting = async (key, value) => {
    return prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
    })
}

/**
 * Delete a setting
 */
export const deleteSetting = async (key) => {
    return prisma.setting.delete({
        where: { key }
    })
}
