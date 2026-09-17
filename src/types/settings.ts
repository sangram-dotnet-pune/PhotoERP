export const WORKFLOW_STATUSES = [
  'Draft',
  'Sent',
  'Confirmed',
  'Completed',
  'Cancelled',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

// ==============================
// Studio Settings
// ==============================

export interface StudioSettings {
  studio_name: string;
  studio_phone: string;
  studio_email: string;
  studio_website: string;
  studio_address: string;
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  studio_name: 'Photo ERP Studio',
  studio_phone: '+91 9022624329',
  studio_email: 'Jadhavomkar604@gmail.com',
  studio_website: 'www.photoerp.com',
  studio_address: '',
};