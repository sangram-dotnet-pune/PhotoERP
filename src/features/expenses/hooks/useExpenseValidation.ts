import { useCallback, useState } from 'react';

import type { ExpenseFormState } from '../types/expense.types';
import { EXPENSE_TYPES, ExpenseType } from '../types/expense.types';
import { validateRequired, validateNonNegativeNumber } from '../../../utils/validation';

interface ExpenseErrors {
  expenseType: string;
  note: string;
  amount: string;
  expenseDate: string;
}

interface ExpenseTouched {
  expenseType: boolean;
  note: boolean;
  amount: boolean;
  expenseDate: boolean;
}

const emptyErrors: ExpenseErrors = {
  expenseType: '',
  note: '',
  amount: '',
  expenseDate: '',
};

const initialTouched: ExpenseTouched = {
  expenseType: false,
  note: false,
  amount: false,
  expenseDate: false,
};

export const useExpenseValidation = () => {
  const [errors, setErrors] = useState<ExpenseErrors>(emptyErrors);
  const [touched, setTouched] = useState<ExpenseTouched>(initialTouched);

  const touchField = useCallback((field: keyof ExpenseTouched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback((expense: ExpenseFormState): boolean => {
    const newErrors: ExpenseErrors = { ...emptyErrors };

    const typeError = validateRequired(expense.expense_type, 'Expense type');
    if (typeError) newErrors.expenseType = typeError;

    if (
      expense.expense_type &&
      !EXPENSE_TYPES.includes(expense.expense_type as ExpenseType)
    ) {
      newErrors.expenseType =
        'Expense type must be Person, Equipment or Other.';
    }

    const noteError = validateRequired(expense.note, 'Note');
    if (noteError) newErrors.note = noteError;

    const amountError = validateNonNegativeNumber(expense.amount, 'Amount');
    if (amountError) newErrors.amount = amountError;

    if (!expense.expense_date) {
      newErrors.expenseDate = 'Expense date is required.';
    }

    setErrors(newErrors);
    setTouched({
      expenseType: true,
      note: true,
      amount: true,
      expenseDate: true,
    });

    return Object.values(newErrors).every((e) => !e);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors(emptyErrors);
    setTouched(initialTouched);
  }, []);

  const validateField = useCallback(
    (field: keyof ExpenseTouched, expense: ExpenseFormState) => {
      setErrors((prev) => {
        const next = { ...prev };
        switch (field) {
          case 'expenseType': {
            const error = validateRequired(expense.expense_type, 'Expense type');
            if (error) {
              next.expenseType = error;
            } else if (
              !EXPENSE_TYPES.includes(expense.expense_type as ExpenseType)
            ) {
              next.expenseType =
                'Expense type must be Person, Equipment or Other.';
            } else {
              next.expenseType = '';
            }
            break;
          }
          case 'note': {
            const error = validateRequired(expense.note, 'Note');
            next.note = error || '';
            break;
          }
          case 'amount': {
            const error = validateNonNegativeNumber(expense.amount, 'Amount');
            next.amount = error || '';
            break;
          }
          case 'expenseDate': {
            next.expenseDate = expense.expense_date ? '' : 'Expense date is required.';
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