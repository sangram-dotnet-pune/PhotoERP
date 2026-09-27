import { invoke } from '@tauri-apps/api/core';

import type {
  Branding,
  TemplateSettings,
} from '../types/templateSettings';

class TemplateSettingsService {
  async getTemplateSettings(): Promise<TemplateSettings> {
    return invoke<TemplateSettings>('get_template_settings');
  }

  async saveTemplateSettings(
    settings: TemplateSettings,
  ): Promise<void> {
    return invoke<void>('save_template_settings', { settings });
  }

  async getBranding(): Promise<Branding> {
    return invoke<Branding>('get_branding');
  }

  async saveBranding(branding: Branding): Promise<void> {
    return invoke<void>('save_branding', { branding });
  }

  async getLogo(): Promise<string> {
    return invoke<string>('get_logo');
  }

  async saveLogoFromPath(path: string): Promise<void> {
    return invoke<void>('save_logo_from_path', { path });
  }

  async clearLogo(): Promise<void> {
    return invoke<void>('clear_logo');
  }
}

export const templateSettingsService = new TemplateSettingsService();