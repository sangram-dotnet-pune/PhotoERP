import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';

interface PaymentSummaryProps {
  subtotal: number;
  discount: number | '';
  advance: number | '';
  total: number;
  balance: number;

  setDiscount: (value: number | '') => void;
  setAdvance: (value: number | '') => void;

  readOnly?: boolean;

  error?: {
    discount: string;
    advance: string;
  };

  touched?: {
    discount: boolean;
    advance: boolean;
  };

  onTouchField?: (field: 'discount' | 'advance') => void;
  onValidateField?: (field: 'discount' | 'advance', state: { discount: number | ''; advance: number | ''; subtotal: number; total: number }) => void;
}

const PaymentSummary = ({
  subtotal,
  discount,
  advance,
  total,
  balance,
  setDiscount,
  setAdvance,
  readOnly = false,
  error,
  touched,
  onTouchField,
  onValidateField,
}: PaymentSummaryProps) => {
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setDiscount('');
    } else {
      const num = Number(val);
      setDiscount(num < 0 ? 0 : num);
    }
  };

  const handleAdvanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAdvance('');
    } else {
      const num = Number(val);
      setAdvance(num < 0 ? 0 : num);
    }
  };

  const handleDiscountBlur = () => {
    if (onTouchField) onTouchField('discount');
    if (onValidateField) {
      onValidateField('discount', { discount, advance, subtotal, total });
    }
  };

  const handleAdvanceBlur = () => {
    if (onTouchField) onTouchField('advance');
    if (onValidateField) {
      onValidateField('advance', { discount, advance, subtotal, total });
    }
  };

  return (
    <Card title="Payment Summary">
      <div className="space-y-6">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Subtotal</span>

          <span className="text-lg font-semibold">
            ₹{subtotal.toLocaleString()}
          </span>
        </div>

        {/* Discount */}
        <Input
          label="Discount"
          type="number"
          value={discount}
          min={0}
          readOnly={readOnly}
          onChange={handleDiscountChange}
          onBlur={handleDiscountBlur}
          error={touched?.discount ? error?.discount : undefined}
          id="discount"
          name="discount"
        />

        {/* Grand Total */}
        <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
          <span className="font-medium text-slate-700">
            Grand Total
          </span>

          <span className="text-2xl font-bold text-blue-600">
            ₹{total.toLocaleString()}
          </span>
        </div>

        {/* Advance */}
        <Input
          label="Advance Paid"
          type="number"
          value={advance}
          min={0}
          readOnly={readOnly}
          onChange={handleAdvanceChange}
          onBlur={handleAdvanceBlur}
          error={touched?.advance ? error?.advance : undefined}
          id="advance"
          name="advance"
        />

        {/* Balance */}
        <div className="flex items-center justify-between rounded-lg bg-green-50 p-4">
          <span className="font-medium text-slate-700">
            Balance Amount
          </span>

          <span className="text-2xl font-bold text-green-600">
            ₹{balance.toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default PaymentSummary;
