import type { QuotationDto } from '../types/database';
import type { UseQuotationState } from '../features/quotations/types/quotation.types';

export const mapQuotationToDto = (
  data: UseQuotationState,
): QuotationDto => {
  return {
    id: data.id,
    quotation_number: data.quotationNo,
    quotation_date: data.quotationDate,
    status: data.status,
    client_id: data.clientId,

    client: {
      name: data.client.name,
      phone: data.client.phone,
      email: data.client.email,
      address: data.client.address,
    },

    event_type: data.event.eventType,
    event_date: data.event.eventDate,
    event_time: data.event.eventTime,

    venue: data.event.venue,
    city: data.event.city,
    event_notes: data.event.eventNotes,

    subtotal: data.subtotal,
    discount: data.discount,
    advance_amount: data.advance,
    total: data.total,
    balance: data.balance,

    notes: data.notes,

    services: data.services.map((service) => ({
      id: service.id,
      service_name: service.serviceName,
      quantity: service.quantity,
      price: service.price,
      total: service.quantity * service.price,
    })),
  };
};

export const mapDtoToQuotationState = (
  dto: QuotationDto,
): UseQuotationState => {
  return {
    id: dto.id,
    quotationNo: dto.quotation_number,

    quotationDate:
      dto.quotation_date || new Date().toISOString().split('T')[0],

    status: dto.status || 'Draft',

    clientId: dto.client_id,

    client: {
      name: dto.client.name,
      phone: dto.client.phone,
      email: dto.client.email,
      address: dto.client.address,
    },

    event: {
      eventType: dto.event_type,
      eventDate: dto.event_date,
      eventTime: dto.event_time,
      venue: dto.venue,
      city: dto.city,
      eventNotes: dto.event_notes || '',
    },

    services: dto.services.map((service, index) => ({
      id: service.id ?? index + 1,
      serviceName: service.service_name,
      quantity: service.quantity || 1,
      price: service.price,
    })),

    notes: dto.notes,

    discount: dto.discount,

    advance: dto.advance_amount,

    subtotal: dto.subtotal,

    total: dto.total,

    balance: dto.balance,
  };
};