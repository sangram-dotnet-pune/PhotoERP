import { useCallback, useState } from 'react';

import type { ExpenseFormValues } from '../types/expenseForm.types';
import {
  validateRequired,
  validatePositiveNumber,
} from '../../../utils/validation';

export interface ExpenseErrors {
  expenseType: string;
  quotation: string;
  expenseDate: string;
  category: string;
  amount: string;
}

interface ExpenseTouched {
  expenseType: boolean;
  quotation: boolean;
  expenseDate: boolean;
  category: boolean;
  amount: boolean;
}

const emptyErrors: ExpenseErrors = {
  expenseType: '',
  quotation: '',
  expenseDate: '',
  category: '',
  amount: '',
};

const initialTouched: ExpenseTouched = {
  expenseType: false,
  quotation: false,
  expenseDate: false,
  category: false,
  amount: false,
};

const validateValues = (values: ExpenseFormValues): ExpenseErrors => {
  const errors: ExpenseErrors = { ...emptyErrors };

  errors.expenseType =
    validateRequired(values.expenseType, 'Expense type') ?? '';

  errors.expenseDate =
    validateRequired(values.expense_date, 'Expense date') ?? '';

  errors.category = validateRequired(values.category, 'Category') ?? '';

  errors.amount = validatePositiveNumber(values.amount, 'Amount') ?? '';

  errors.quotation =
    values.expenseType === 'Order Expense' && !values.quotationId
      ? 'Select the quotation this expense belongs to.'
      : '';

  return errors;
};

export const useExpenseValidation = () => {
  const [errors, setErrors] = useState<ExpenseErrors>(emptyErrors);
  const [touched, setTouched] = useState<ExpenseTouched>(initialTouched);

  const touchField = useCallback((field: keyof ExpenseTouched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback((values: ExpenseFormValues): boolean => {
    const newErrors = validateValues(values);

    setErrors(newErrors);
    setTouched({
      expenseType: true,
      quotation: true,
      expenseDate: true,
      category: true,
      amount: true,
    });

    return Object.values(newErrors).every((e) => !e);
  }, []);

  const validateField = useCallback(
    (field: keyof ExpenseTouched, values: ExpenseFormValues) => {
      const current = validateValues(values);
      setErrors((prev) => ({ ...prev, [field]: current[field] }));
    },
    [],
  );

  const clearErrors = useCallback(() => {
    setErrors(emptyErrors);
    setTouched(initialTouched);
  }, []);

  return {
    errors,
    touched,
    touchField,
    validate,
    validateField,
    clearErrors,
  };
};