export interface PdfQuotation {
  quotationNo: string;
  quotationDate: string;
  validTill: string;

  client: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };

  event: {
    eventType: string;
    eventDate: string;
    eventTime: string;
    venue: string;
    city: string;
    eventNotes: string;
  };

  services: {
    id: number;
    serviceName: string;
    quantity: number;
    price: number;
  }[];

  subtotal: number;
  discount: number;
  advance: number;
  total: number;
  balance: number;

  studio: {
    name: string;
    phone: string;
    email: string;
    website: string;
    address: string;
  };
}