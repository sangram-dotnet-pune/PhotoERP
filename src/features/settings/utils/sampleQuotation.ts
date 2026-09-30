import type { PdfQuotation } from '../../quotations/pdf/types';
import type { TemplateSettings } from '../../../types/templateSettings';
import type { StudioSettings } from '../../../types/settings';
import { APPLICATION_LOGO } from '../../quotations/pdf/decor';

/**
 * Builds a realistic sample quotation used for the live PDF preview inside the
 * template editor and setup wizard.
 */
export const buildSampleQuotation = (
  template: TemplateSettings,
  studio: StudioSettings,
): PdfQuotation => {
  return {
    quotationNo: 'QT-0001',
    quotationDate: '16 Sep 2026',
    validTill: 'N/A',

    client: {
      name: 'Mr. & Mrs. Sharma',
      phone: '+91 98765 43210',
      email: 'sharma@example.com',
      address: 'Mumbai, Maharashtra',
    },

    event: {
      eventType: 'Wedding',
      eventDate: '2026-11-12',
      eventTime: '08:00 AM onwards',
      venue: 'The Grand Palace',
      city: 'Mumbai',
      eventNotes: 'Candid coverage required throughout the day.',
    },

    services: [
      { id: 1, serviceName: 'Photography', quantity: 1, price: 45000 },
      { id: 2, serviceName: 'Videography', quantity: 1, price: 35000 },
      { id: 3, serviceName: 'Pre-wedding Shoot', quantity: 1, price: 15000 },
    ],

    subtotal: 95000,
    discount: 0,
    advance: 47500,
    total: 95000,
    balance: 47500,

    notes: '50% advance required to confirm the booking. Final prices valid for 30 days.',

    studio: {
      name: studio.studio_name,
      ownerName: studio.owner_name || '',
      phone: studio.studio_phone,
      email: studio.studio_email,
      address: studio.studio_address,
    },

    template,
    logo: APPLICATION_LOGO,
  };
};