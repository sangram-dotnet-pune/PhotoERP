import { useCallback, useState } from 'react';

import type { Payment, PaymentInput } from '../types/payment.types';
import { PAYMENT_METHODS } from '../types/payment.types';
import {
  validatePositiveNumber,
  validateDate,
  validateSelect,
} from '../../../utils/validation';

interface PaymentErrors {
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
}

interface PaymentTouched {
  amount: boolean;
  paymentDate: boolean;
  paymentMethod: boolean;
  notes: boolean;
}

const emptyErrors: PaymentErrors = {
  amount: '',
  paymentDate: '',
  paymentMethod: '',
  notes: '',
};

const initialTouched: PaymentTouched = {
  amount: false,
  paymentDate: false,
  paymentMethod: false,
  notes: false,
};

export const usePaymentValidation = (quotationBalance?: number) => {
  const [errors, setErrors] = useState<PaymentErrors>(emptyErrors);
  const [touched, setTouched] = useState<PaymentTouched>(initialTouched);

  const touchField = useCallback((field: keyof PaymentTouched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback(
    (payment: PaymentInput | Payment): boolean => {
      const newErrors: PaymentErrors = { ...emptyErrors };

      const amountError = validatePositiveNumber(payment.amount, 'Amount');
      if (amountError) {
        newErrors.amount = amountError;
      } else if (quotationBalance !== undefined && payment.amount > quotationBalance) {
        newErrors.amount = `Payment cannot exceed outstanding balance of ₹${quotationBalance.toLocaleString()}`;
      }

      const dateError = validateDate(payment.payment_date, 'Payment date');
      if (dateError) newErrors.paymentDate = dateError;

      const methodError = validateSelect(payment.payment_method, 'Payment method');
      if (methodError) newErrors.paymentMethod = methodError;
      else if (!PAYMENT_METHODS.includes(payment.payment_method as typeof PAYMENT_METHODS[0])) {
        newErrors.paymentMethod = 'Select a valid payment method';
      }

      if (payment.notes && payment.notes.length > 1000) {
        newErrors.notes = 'Notes must be less than 1000 characters';
      }

      setErrors(newErrors);

      return Object.values(newErrors).every((e) => !e);
    },
    [quotationBalance]
  );

  const clearErrors = useCallback(() => {
    setErrors(emptyErrors);
  }, []);

  const validateField = useCallback(
    (field: keyof PaymentTouched, payment: PaymentInput | Payment) => {
      setErrors((prev) => {
        const next = { ...prev };
        switch (field) {
          case 'amount': {
            const error = validatePositiveNumber(payment.amount, 'Amount');
            next.amount = error || '';
            if (!error && quotationBalance !== undefined && payment.amount > quotationBalance) {
              next.amount = `Payment cannot exceed outstanding balance of ₹${quotationBalance.toLocaleString()}`;
            }
            break;
          }
          case 'paymentDate': {
            const error = validateDate(payment.payment_date, 'Payment date');
            next.paymentDate = error || '';
            break;
          }
          case 'paymentMethod': {
            const error = validateSelect(payment.payment_method, 'Payment method');
            next.paymentMethod = error || '';
            if (!error && !PAYMENT_METHODS.includes(payment.payment_method as typeof PAYMENT_METHODS[0])) {
              next.paymentMethod = 'Select a valid payment method';
            }
            break;
          }
          case 'notes': {
            if (payment.notes && payment.notes.length > 1000) {
              next.notes = 'Notes must be less than 1000 characters';
            } else {
              next.notes = '';
            }
            break;
          }
        }
        return next;
      });
    },
    [quotationBalance]
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