import { useEffect, useState } from 'react';

import { settingsService } from '../services/settings.service';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../types/settings';

/**
 * Load studio settings once for PDF generation. Falls back to defaults so the
 * PDF always has usable contact details even before the user saves settings.
 */
export const useStudioSettings = (): StudioSettings | undefined => {
  const [settings, setSettings] = useState<StudioSettings>();

  useEffect(() => {
    let active = true;

    settingsService
      .getStudioSettings()
      .then((s) => {
        if (active) setSettings(s);
      })
      .catch(() => {
        if (active) setSettings(DEFAULT_STUDIO_SETTINGS);
      });

    return () => {
      active = false;
    };
  }, []);

  return settings;
};