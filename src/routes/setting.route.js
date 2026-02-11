import { Router } from 'express'
import * as SettingController from '../controllers/setting.controller.js'

const router = Router()

// Get all settings
router.get('/', SettingController.getSettings)

// Update a setting
router.post('/', SettingController.updateSetting)

export default router
