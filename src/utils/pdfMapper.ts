import type { PdfQuotation } from '../features/quotations/pdf/types';
import type { QuotationDto } from '../types/database';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../types/settings';

const formatDisplayDate = (iso: string): string => {
  if (!iso) return '';

  // Expects YYYY-MM-DD and renders as e.g. 16 Sep 2026.
  const parts = iso.split('-');

  if (parts.length !== 3) return iso;

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const month = months[Number(parts[1]) - 1];

  if (!month) return iso;

  return `${Number(parts[2])} ${month} ${parts[0]}`;
};

export const mapQuotationToPdf = (
  quotation: QuotationDto,
  studio?: Partial<StudioSettings>,
): PdfQuotation => {
  const resolvedStudio = {
    ...DEFAULT_STUDIO_SETTINGS,
    ...(studio || {}),
  };

  return {
    quotationNo: quotation.quotation_number,

    quotationDate: formatDisplayDate(quotation.quotation_date || ''),

    validTill: 'N/A',

    client: {
      name: quotation.client.name,
      phone: quotation.client.phone,
      email: quotation.client.email,
      address: quotation.client.address,
    },

    event: {
      eventType: quotation.event_type,
      eventDate: quotation.event_date,
      eventTime: quotation.event_time,
      venue: quotation.venue,
      city: quotation.city,
      eventNotes: quotation.event_notes || '',
    },

    services: quotation.services.map((service, index) => ({
      id: index + 1,
      serviceName: service.service_name,
      quantity: service.quantity || 1,
      price: service.price,
    })),

    subtotal: quotation.subtotal,
    discount: quotation.discount,
    advance: quotation.advance_amount,
    total: quotation.total,
    balance: quotation.balance,

    studio: {
      name: resolvedStudio.studio_name,
      phone: resolvedStudio.studio_phone,
      email: resolvedStudio.studio_email,
      website: resolvedStudio.studio_website,
      address: resolvedStudio.studio_address,
    },
  };
};