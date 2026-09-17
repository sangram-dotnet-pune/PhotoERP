// ==============================
// Client Details
// ==============================

export interface ClientDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
}

// ==============================
// Event Details
// ==============================

export interface EventDetails {
  eventType: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  city: string;
  eventNotes: string;
}

// ==============================
// Service Item
// ==============================

export interface ServiceItem {
  id: number;

  serviceName: string;

  quantity: number;

  price: number;
}

// ==============================
// Complete Form State
// ==============================

export interface UseQuotationState {
  id?: number;
  quotationNo: string;

  quotationDate: string;

  status: string;

  clientId?: number;

  client: ClientDetails;

  event: EventDetails;

  services: ServiceItem[];

  notes: string;

  discount: number;

  advance: number;

  subtotal: number;

  total: number;

  balance: number;
}