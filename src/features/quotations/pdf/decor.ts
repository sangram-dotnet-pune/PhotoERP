import type { CSSProperties } from 'react';

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

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const cleaned = hex.replace('#', '');

  if (cleaned.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return null;
  }

  const num = parseInt(cleaned, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const mixWithWhite = (hex: string, factor: number): string => {
  const rgb = hexToRgb(hex);

  if (!rgb) return hex;

  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * factor);

  const toHex = (value: number) =>
    value.toString(16).padStart(2, '0');

  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
};

/**
 * Convert the template settings into CSS custom properties applied on the
 * A4 page so every PDF component picks up the custom theme.
 */
export const buildPdfCssVars = (template: TemplateSettings): CSSProperties => {
  const primary = template.primary_color;
  const secondary = template.secondary_color;
  const background = template.background_color;

  const vars: Record<string, string | number> = {
    '--rose': primary,
    '--rose-dark': secondary,
    '--cream': mixWithWhite(background, 0.5),
    '--pink': mixWithWhite(primary, 0.82),
    '--pink-light': mixWithWhite(primary, 0.9),
    '--border': mixWithWhite(primary, 0.72),
    '--font-main': `'${template.font_family}', Arial, sans-serif`,
  };

  if (template.font_size > 0) {
    vars.fontSize = `${template.font_size}px`;
  }

  return vars as CSSProperties;
};

export const DEFAULT_PDF_CONFIG: PdfConfig = {
  template: DEFAULT_TEMPLATE_SETTINGS,
  branding: DEFAULT_BRANDING,
  logo: APPLICATION_LOGO,
};