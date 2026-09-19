export interface QuotationErrors {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  noServices: string;
  discountExceeds: string;
  advanceExceeds: string;
  serviceName: string;
  serviceQuantity: string;
  servicePrice: string;
}

export interface FieldTouched {
  name: boolean;
  phone: boolean;
  email: boolean;
  eventType: boolean;
  eventDate: boolean;
  discount: boolean;
  advance: boolean;
}
