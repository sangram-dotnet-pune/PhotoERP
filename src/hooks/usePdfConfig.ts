import { useCallback, useEffect, useState } from 'react';

import { settingsService } from '../services/settings.service';
import { templateSettingsService } from '../services/templateSettings.service';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../types/settings';
import {
  DEFAULT_PDF_CONFIG,
  PdfConfig,
} from '../features/quotations/pdf/decor';

/**
 * Loads everything the quotation PDF needs (studio details, template styling,
 * branding colors and the uploaded logo) once, bundled into a single config.
 * Falls back to sensible defaults so PDF generation always works.
 */
export const usePdfConfig = (): {
  config: PdfConfig;
  studio: StudioSettings;
  ready: boolean;
} => {
  const [config, setConfig] = useState<PdfConfig>(DEFAULT_PDF_CONFIG);
  const [studio, setStudio] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [settings, template, branding, logo] = await Promise.all([
        settingsService.getStudioSettings(),
        templateSettingsService.getTemplateSettings(),
        templateSettingsService.getBranding(),
        templateSettingsService.getLogo(),
      ]);

      setStudio(settings);
      setConfig({
        template,
        branding,
        logo,
      });
    } catch (error) {
      console.error('Failed to load PDF config', error);
      setStudio(DEFAULT_STUDIO_SETTINGS);
      setConfig(DEFAULT_PDF_CONFIG);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { config, studio, ready };
};