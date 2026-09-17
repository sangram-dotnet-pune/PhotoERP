import { useCallback, useState } from 'react';

import type { UseQuotationState } from '../types/quotation.types';
import type { QuotationErrors, FieldTouched } from '../types/validation.types';
import {
  validateRequired,
  validatePhone,
  validateEmail,
  validateSelect,
  validateArrayLength,
  validateNonNegativeNumber,
  validateMaxValue,
  validateDate,
  validatePositiveNumber,
} from '../../../utils/validation';

const emptyErrors: QuotationErrors = {
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  eventType: '',
  eventDate: '',
  noServices: '',
  discountExceeds: '',
  advanceExceeds: '',
};

const initialTouched: FieldTouched = {
  name: false,
  phone: false,
  email: false,
  eventType: false,
  eventDate: false,
};

export const useQuotationValidation = () => {
  const [errors, setErrors] = useState<QuotationErrors>(emptyErrors);
  const [touched, setTouched] = useState<FieldTouched>(initialTouched);

  const touchField = useCallback((field: keyof FieldTouched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback((state: UseQuotationState): boolean => {
    const newErrors: QuotationErrors = { ...emptyErrors };

    const nameError = validateRequired(state.client.name, 'Client name');
    if (nameError) newErrors.clientName = nameError;

    const phoneError = validatePhone(state.client.phone);
    if (phoneError) newErrors.clientPhone = phoneError;

    const emailError = validateEmail(state.client.email);
    if (emailError) newErrors.clientEmail = emailError;

    const eventTypeError = validateSelect(state.event.eventType, 'Event type');
    if (eventTypeError) newErrors.eventType = eventTypeError;

    const eventDateError = validateDate(state.event.eventDate, 'Event date');
    if (eventDateError) newErrors.eventDate = eventDateError;

    const servicesError = validateArrayLength(state.services, 1, 'service');
    if (servicesError) newErrors.noServices = servicesError;

    for (const service of state.services) {
      const nameError = validateSelect(service.serviceName, 'Service name');
      if (nameError) {
        newErrors.noServices = nameError;
        break;
      }
      const qtyError = validatePositiveNumber(service.quantity, 'Quantity');
      if (qtyError) {
        newErrors.noServices = qtyError;
        break;
      }
      const priceError = validateNonNegativeNumber(service.price, 'Price');
      if (priceError) {
        newErrors.noServices = priceError;
        break;
      }
    }

    const discountError = validateNonNegativeNumber(state.discount, 'Discount');
    if (discountError) newErrors.discountExceeds = discountError;
    else {
      const maxDiscountError = validateMaxValue(state.discount, state.subtotal, 'Discount');
      if (maxDiscountError) newErrors.discountExceeds = maxDiscountError;
    }

    const advanceError = validateNonNegativeNumber(state.advance, 'Advance');
    if (advanceError) newErrors.advanceExceeds = advanceError;
    else {
      const maxAdvanceError = validateMaxValue(state.advance, state.total, 'Advance');
      if (maxAdvanceError) newErrors.advanceExceeds = maxAdvanceError;
    }

    setErrors(newErrors);

    return Object.values(newErrors).every((e) => !e);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors(emptyErrors);
  }, []);

  const validateField = useCallback(
    (field: keyof FieldTouched, state: UseQuotationState) => {
      setErrors((prev) => {
        const next = { ...prev };
        switch (field) {
          case 'name': {
            const error = validateRequired(state.client.name, 'Client name');
            next.clientName = error || '';
            break;
          }
          case 'phone': {
            const error = validatePhone(state.client.phone);
            next.clientPhone = error || '';
            break;
          }
          case 'email': {
            const error = validateEmail(state.client.email);
            next.clientEmail = error || '';
            break;
          }
          case 'eventType': {
            const error = validateSelect(state.event.eventType, 'Event type');
            next.eventType = error || '';
            break;
          }
          case 'eventDate': {
            const error = validateDate(state.event.eventDate, 'Event date');
            next.eventDate = error || '';
            break;
          }
        }
        return next;
      });
    },
    []
  );

  return {
    errors,
    touched,
    touchField,
    validate,
    validateField,
    clearErrors,
  };
};