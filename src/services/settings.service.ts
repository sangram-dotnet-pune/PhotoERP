import { invoke } from '@tauri-apps/api/core';

import type { StudioSettings } from '../types/settings';

class SettingsService {
  async getStudioSettings(): Promise<StudioSettings> {
    return invoke<StudioSettings>('get_settings');
  }

  async saveStudioSettings(
    settings: StudioSettings,
  ): Promise<void> {
    return invoke('save_settings', { settings });
  }
}

export const settingsService = new SettingsService();