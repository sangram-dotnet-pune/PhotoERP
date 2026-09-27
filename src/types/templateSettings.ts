export type HeaderStyle = 'classic' | 'minimal' | 'modern';

export type ServiceTableStyle = 'ribbon' | 'minimal' | 'bordered';

export const FONT_FAMILIES = [
  'Poppins',
  'Inter',
  'Lato',
  'Playfair Display',
  'Georgia',
  'Arial',
  'Verdana',
] as const;

export const HEADER_STYLES: { value: HeaderStyle; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'modern', label: 'Modern' },
];

export const TABLE_STYLES: { value: ServiceTableStyle; label: string }[] = [
  { value: 'ribbon', label: 'Ribbon' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bordered', label: 'Bordered' },
];

export interface Branding {
  primary_color: string;
  secondary_color: string;
}

export interface TemplateSettings {
  font_family: string;
  font_size: number;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  header_style: HeaderStyle;
  quotation_title: string;
  show_logo: boolean;
  show_quotation_meta: boolean;
  show_client_section: boolean;
  show_event_section: boolean;
  show_services_section: boolean;
  show_service_prices: boolean;
  service_table_style: ServiceTableStyle;
  show_totals_section: boolean;
  show_terms: boolean;
  terms_and_conditions: string;
  show_signature: boolean;
  signature_name: string;
  signature_role: string;
  show_footer: boolean;
  footer_text: string;
  footer_contact: boolean;
  page_margin: number;
  header_spacing: number;
  footer_spacing: number;
}

export const DEFAULT_BRANDING: Branding = {
  primary_color: '#B97862',
  secondary_color: '#965944',
};

export const DEFAULT_TEMPLATE_SETTINGS: TemplateSettings = {
  font_family: 'Poppins',
  font_size: 13.5,
  primary_color: '#B97862',
  secondary_color: '#965944',
  background_color: '#F8F3E8',
  header_style: 'classic',
  quotation_title: 'QUOTATION',
  show_logo: true,
  show_quotation_meta: true,
  show_client_section: true,
  show_event_section: true,
  show_services_section: true,
  show_service_prices: false,
  service_table_style: 'ribbon',
  show_totals_section: true,
  show_terms: true,
  terms_and_conditions:
    '50% advance required to confirm the booking.\n' +
    'Balance payment must be cleared before the event.\n' +
    'No cancellation or refund after confirmation.\n' +
    'Extra coverage hours will be charged separately.\n' +
    'Travelling and accommodation charges are extra if applicable.',
  show_signature: false,
  signature_name: '',
  signature_role: '',
  show_footer: true,
  footer_text: 'Thank you for choosing us!',
  footer_contact: true,
  page_margin: 0,
  header_spacing: 30,
  footer_spacing: 30,
};