import photoERP from './logo.png';

import {
  DEFAULT_BRANDING,
  DEFAULT_TEMPLATE_SETTINGS,
  type Branding,
  type TemplateSettings,
} from '../../../types/templateSettings';

export interface PdfConfig {
  template: TemplateSettings;
  branding: Branding;
  logo: string;
}

/**
 * The studio logo is fixed and bundled with the app — it cannot be changed by
 * the user. Every PDF and preview uses this image.
 */
export const APPLICATION_LOGO = photoERP;

/**
 * Merge branding colors on top of template colors so the "Logo & Branding"
 * section (primary/secondary) consistently drives the PDF look.
 */
export const resolveTemplateColors = (
  template: TemplateSettings,
  branding: Branding,
): TemplateSettings => {
  return {
    ...template,
    primary_color: branding.primary_color,
    secondary_color: branding.secondary_color,
  };
};

export const DEFAULT_PDF_CONFIG: PdfConfig = {
  template: DEFAULT_TEMPLATE_SETTINGS,
  branding: DEFAULT_BRANDING,
  logo: APPLICATION_LOGO,
};