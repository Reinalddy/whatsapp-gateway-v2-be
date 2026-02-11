import * as SettingService from '../services/setting.service.js'

/**
 * Get all settings
 */
export const getSettings = async (req, res) => {
    try {
        const settings = await SettingService.getSettings()
        res.json({
            code: 200,
            message: 'Settings retrieved successfully',
            data: settings
        })
    } catch (error) {
        console.error('Get settings error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to retrieve settings',
            error: error.message
        })
    }
}

/**
 * Update a setting
 */
export const updateSetting = async (req, res) => {
    try {
        const { key, value } = req.body

        if (!key || value === undefined) {
            return res.status(400).json({
                code: 400,
                message: 'Key and value are required'
            })
        }

        const setting = await SettingService.updateSetting(key, String(value))

        res.json({
            code: 200,
            message: 'Setting updated successfully',
            data: setting
        })
    } catch (error) {
        console.error('Update setting error:', error)
        res.status(500).json({
            code: 500,
            message: 'Failed to update setting',
            error: error.message
        })
    }
}
