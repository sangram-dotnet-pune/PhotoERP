import { useEffect, useMemo, useState } from 'react';

import type {
  ClientDetails,
  EventDetails,
  ServiceItem,
  UseQuotationState,
} from '../types/quotation.types';
import { QuotationDto } from '../../../types/database';
import { mapDtoToQuotationState } from '../../../utils/quotationMapper';
import { quotationService } from '../../../services/quotation.service';

const num = (v: number | string) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export type UseQuotationReturn = ReturnType<typeof useQuotation>;

export const useQuotation = () => {
  // ==============================
  // Quotation Info
  // ==============================

  const [quotationNo, setQuotationNo] = useState('');

  const [quotationId, setQuotationId] =
    useState<number | undefined>();

  const [quotationDate, setQuotationDate] = useState(
    new Date().toLocaleDateString('en-CA'),
  );

  const [status, setStatus] = useState('Draft');

  // ==============================
  // Client
  // ==============================

  const [client, setClient] = useState<ClientDetails>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  /// When set, the quotation is linked to an existing client record instead
  /// of creating a new one on save.
  const [clientId, setClientId] = useState<number | undefined>();

  // ==============================
  // Event
  // ==============================

  const [event, setEvent] = useState<EventDetails>({
    eventType: '',
    eventDate: '',
    eventTime: '',
    venue: '',
    city: '',
    eventNotes: '',
  });

  // ==============================
  // Services
  // ==============================

  const [services, setServices] = useState<ServiceItem[]>([]);

  // Service validation state
  const [touchedServices, setTouchedServices] = useState<
    Record<number, { name: boolean; quantity: boolean; price: boolean }>
  >({});

  const touchServiceField = (
    serviceId: number,
    field: 'name' | 'quantity' | 'price',
  ) => {
    setTouchedServices((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: true,
      },
    }));
  };

  // ==============================
  // Payment
  // ==============================

  const [discount, setDiscount] = useState<number | ''>('');

  const [advance, setAdvance] = useState<number | ''>('');

  // Payment validation state
  const [paymentTouched, setPaymentTouched] = useState<{
    discount: boolean;
    advance: boolean;
  }>({
    discount: false,
    advance: false,
  });

  const touchPaymentField = (field: 'discount' | 'advance') => {
    setPaymentTouched((prev) => ({ ...prev, [field]: true }));
  };

  // ==============================
  // Notes
  // ==============================

  const [notes, setNotes] = useState('');

  // ==============================
  // Fetch the next sequential quotation number on mount for new quotations.
  // ==============================

  useEffect(() => {
    quotationService
      .generateQuotationNumber()
      .then((n) => setQuotationNo(n))
      .catch(() => setQuotationNo('QT-'));
  }, []);

  // ==============================
  // Client Update
  // ==============================

  const updateClient = (
    field: keyof ClientDetails,
    value: string,
  ) => {
    setClient((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ==============================
  // Select an Existing Client
  // ==============================

  const selectClient = (details: {
    id?: number;
    name: string;
    phone: string;
    email: string;
    address: string;
  }) => {
    setClientId(details.id);
    setClient({
      name: details.name,
      phone: details.phone,
      email: details.email,
      address: details.address,
    });
  };

  // ==============================
  // Create a New Client
  // ==============================

  const clearClient = () => {
    setClientId(undefined);
    setClient({ name: '', phone: '', email: '', address: '' });
  };

  // ==============================
  // Event Update
  // ==============================

  const updateEvent = (
    field: keyof EventDetails,
    value: string,
  ) => {
    setEvent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ==============================
  // Add Service
  // ==============================

  const addService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: Date.now(),
        serviceName: '',
        quantity: 1,
        price: 0,
      },
    ]);
  };

  // ==============================
  // Remove Service
  // ==============================

  const removeService = (id: number) => {
    setServices((prev) =>
      prev.filter((item) => item.id !== id),
    );
  };

  // ==============================
  // Update Service
  // ==============================

  const updateService = (
    id: number,
    field: keyof ServiceItem,
    value: string | number,
  ) => {
    setServices((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  // ==============================
  // Calculations
  // ==============================

  const subtotal = useMemo(() => {
    return services.reduce(
      (sum, item) => sum + num(item.price) * num(item.quantity),
      0,
    );
  }, [services]);

  const total = useMemo(() => {
    return subtotal - num(discount);
  }, [subtotal, discount]);

  const balance = useMemo(() => {
    return total - num(advance);
  }, [total, advance]);

  // ==============================
  // Safe setters (non-negative)
  // ==============================

  const handleSetDiscount = (v: number | '') => {
    if (v === '' || v === 0) {
      setDiscount(v);
    } else {
      setDiscount(v < 0 ? 0 : v);
    }
  };

  const handleSetAdvance = (v: number | '') => {
    if (v === '' || v === 0) {
      setAdvance(v);
    } else {
      setAdvance(v < 0 ? 0 : v);
    }
  };

  const loadQuotation = (dto: QuotationDto) => {
    const state = mapDtoToQuotationState(dto);

    setQuotationNo(state.quotationNo);
    setQuotationDate(state.quotationDate);
    setQuotationId(state.id);
    setClientId(state.clientId);
    setClient(state.client);
    setStatus(state.status);
    setEvent(state.event);

    setServices(state.services);

    setDiscount(state.discount);

    setAdvance(state.advance);

    setNotes(state.notes);
  };

  // ==============================
  // Complete Form State
  // ==============================

  const formState: UseQuotationState = {
    id: quotationId,
    quotationNo,
    quotationDate,

    status,

    clientId,

    client,
    event,

    services,

    notes,

    discount: num(discount),
    advance: num(advance),

    subtotal,
    total,
    balance,
  };

  return {
    // Complete state
    formState,

    // Individual state
    quotationNo,
    quotationDate,
    status,

    clientId,

    client,
    event,
    services,

    notes,

    discount,
    advance,

    subtotal,
    total,
    balance,

    // Setters

    setQuotationDate,
    setStatus,

    setNotes,
    setDiscount: handleSetDiscount,
    setAdvance: handleSetAdvance,

    // Methods
    updateClient,
    updateEvent,

    selectClient,
    clearClient,

    addService,
    removeService,
    updateService,
    loadQuotation,

    // Validation helpers
    touchedServices,
    touchServiceField,
    paymentTouched,
    touchPaymentField,
  };
};