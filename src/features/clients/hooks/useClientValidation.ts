import { useCallback, useState } from 'react';

import type { ClientInfo } from '../types/client.types';
import {
  validateRequired,
  validatePhone,
  validateEmail,
} from '../../../utils/validation';

interface ClientErrors {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface ClientTouched {
  name: boolean;
  phone: boolean;
  email: boolean;
  address: boolean;
}

const emptyErrors: ClientErrors = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

const initialTouched: ClientTouched = {
  name: false,
  phone: false,
  email: false,
  address: false,
};

export const useClientValidation = () => {
  const [errors, setErrors] = useState<ClientErrors>(emptyErrors);
  const [touched, setTouched] = useState<ClientTouched>(initialTouched);

  const touchField = useCallback((field: keyof ClientTouched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback((client: ClientInfo): boolean => {
    const newErrors: ClientErrors = { ...emptyErrors };

    const nameError = validateRequired(client.name, 'Client name');
    if (nameError) newErrors.name = nameError;

    const phoneError = validatePhone(client.phone);
    if (phoneError) newErrors.phone = phoneError;

    const emailError = validateEmail(client.email);
    if (emailError) newErrors.email = emailError;

    if (client.address && client.address.trim().length > 500) {
      newErrors.address = 'Address is too long (max 500 characters)';
    }

    setErrors(newErrors);

    return Object.values(newErrors).every((e) => !e);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors(emptyErrors);
  }, []);

  const validateField = useCallback(
    (field: keyof ClientTouched, client: ClientInfo) => {
      setErrors((prev) => {
        const next = { ...prev };
        switch (field) {
          case 'name': {
            const error = validateRequired(client.name, 'Client name');
            next.name = error || '';
            break;
          }
          case 'phone': {
            const error = validatePhone(client.phone);
            next.phone = error || '';
            break;
          }
          case 'email': {
            const error = validateEmail(client.email);
            next.email = error || '';
            break;
          }
          case 'address': {
            if (client.address && client.address.trim().length > 500) {
              next.address = 'Address is too long (max 500 characters)';
            } else {
              next.address = '';
            }
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