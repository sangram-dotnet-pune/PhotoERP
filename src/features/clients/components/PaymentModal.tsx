import { useEffect, useState } from 'react';

import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import { paymentService } from '../../../services/payment.service';
import { PAYMENT_METHODS } from '../types/payment.types';

interface PaymentModalProps {
  open: boolean;
  quotationId: number;
  onClose: () => void;
  onSaved: () => void;
  title: string;
  confirmText: string;
  initial?: {
    id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes: string;
  };
}

const today = () => new Date().toLocaleDateString('en-CA');

const PaymentModal = ({
  open,
  quotationId,
  onClose,
  onSaved,
  title,
  confirmText,
  initial,
}: PaymentModalProps) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(today());
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) {
      setLocalError('');
      return;
    }

    setAmount(initial ? String(initial.amount) : '');
    setPaymentDate(initial ? initial.payment_date : today());
    setMethod(initial ? initial.payment_method : PAYMENT_METHODS[0]);
    setNotes(initial ? initial.notes : '');
  }, [open, initial]);

  const handleConfirm = async () => {
    if (amount.trim() === '' || Number(amount) <= 0) {
      setLocalError('Enter a valid positive amount.');
      return;
    }

    setLoading(true);

    try {
      if (initial) {
        await paymentService.updatePayment({
          id: initial.id,
          amount: Number(amount),
          payment_date: paymentDate,
          payment_method: method,
          notes,
        });
      } else {
        await paymentService.addPayment({
          quotation_id: quotationId,
          amount: Number(amount),
          payment_date: paymentDate,
          payment_method: method,
          notes,
        });
      }

      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setLocalError('Unable to save payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmText={confirmText}
      loading={loading}
    >
      <div className="space-y-4">
        <Input
          label="Amount"
          type="number"
          min={0}
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={localError || undefined}
        />

        <Input
          label="Payment Date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Payment Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;