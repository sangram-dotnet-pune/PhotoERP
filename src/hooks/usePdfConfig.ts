import { useCallback, useEffect, useState } from 'react';

import { settingsService } from '../services/settings.service';
import { templateSettingsService } from '../services/templateSettings.service';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../types/settings';
import {
  APPLICATION_LOGO,
  DEFAULT_PDF_CONFIG,
  PdfConfig,
} from '../features/quotations/pdf/decor';

/**
 * Loads everything the quotation PDF needs (studio details, template styling
 * and branding colors) once, bundled into a single config. The logo is fixed
 * and bundled with the app. Falls back to sensible defaults so PDF generation
 * always works.
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
      const [settings, template, branding] = await Promise.all([
        settingsService.getStudioSettings(),
        templateSettingsService.getTemplateSettings(),
        templateSettingsService.getBranding(),
      ]);

      setStudio(settings);
      setConfig({
        template,
        branding,
        logo: APPLICATION_LOGO,
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