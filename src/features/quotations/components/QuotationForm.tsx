import ClientDetailsForm from './ClientDetailsForm';
import EventDetailsForm from './EventDetailsForm';
import NotesSection from './NotesSection';
import PaymentSummary from './PaymentSummary';
import QuotationActions from './QuotationActions';
import QuotationHeader from './QuotationHeader';
import ServicesTable from './ServicesTable';

import type { QuotationErrors, FieldTouched } from '../types/validation.types';
import type { UseQuotationReturn } from '../hooks/useQuotation';
import type { UseQuotationState, ServiceItem } from '../types/quotation.types';

interface QuotationFormProps {
  quotation: UseQuotationReturn;
  mode: 'create' | 'edit' | 'view';
  loading: boolean;

  onSaveQuotation?: () => void;
  onUpdateQuotation?: () => void;
  onGeneratePdf?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;

  errors?: QuotationErrors;
  touched?: FieldTouched;
  onTouchField?: (field: keyof FieldTouched) => void;
  onValidateField?: (field: keyof FieldTouched, state: UseQuotationState) => void;

  // Service validation
  serviceErrors?: {
    serviceName?: string;
    serviceQuantity?: string;
    servicePrice?: string;
  };
  touchedServices?: Record<number, { name: boolean; quantity: boolean; price: boolean }>;
  onTouchServiceField?: (serviceId: number, field: 'name' | 'quantity' | 'price') => void;
  onValidateServiceField?: (serviceId: number, field: 'name' | 'quantity' | 'price', state: ServiceItem) => void;

  // Payment validation
  paymentTouched?: { discount: boolean; advance: boolean };
  onTouchPaymentField?: (field: 'discount' | 'advance') => void;
  onValidatePaymentField?: (field: 'discount' | 'advance', state: { discount: number | ''; advance: number | ''; subtotal: number; total: number }) => void;
}

const QuotationForm = ({
  quotation,
  loading,
  mode,
  onUpdateQuotation,
  onEdit,
  onSaveQuotation,
  onGeneratePdf,
  onCancel,
  errors,
  touched,
  onTouchField,
  onValidateField,
  touchedServices,
  onTouchServiceField,
  onValidateServiceField,
  paymentTouched,
  onTouchPaymentField,
  onValidatePaymentField,
}: QuotationFormProps) => {

  const readOnly = mode === 'view';
  const isValidating = mode !== 'view';

  return (
    <div className="space-y-8">
      <QuotationHeader
        quotationNo={quotation.quotationNo}
        quotationDate={quotation.quotationDate}
        disabled={readOnly}
      />

      <ClientDetailsForm
        client={quotation.client}
        onChange={quotation.updateClient}
        readOnly={readOnly}
        showClientSelector={mode === 'create'}
        selectedClientId={quotation.clientId}
        selectedClientName={quotation.client.name}
        onSelectClient={quotation.selectClient}
        onClearClient={quotation.clearClient}
        error={isValidating ? {
          name: errors?.clientName || '',
          phone: errors?.clientPhone || '',
          email: errors?.clientEmail || '',
        } : undefined}
        touched={isValidating ? {
          name: touched?.name || false,
          phone: touched?.phone || false,
          email: touched?.email || false,
        } : undefined}
        onTouchField={isValidating ? onTouchField : undefined}
        onValidateField={isValidating ? onValidateField : undefined}
        quotationState={isValidating ? quotation.formState : undefined}
      />

      <EventDetailsForm
        event={quotation.event}
        onChange={quotation.updateEvent}
        readOnly={readOnly}
        error={isValidating ? {
          eventType: errors?.eventType || '',
          eventDate: errors?.eventDate || '',
        } : undefined}
        touched={isValidating ? {
          eventType: touched?.eventType || false,
          eventDate: touched?.eventDate || false,
        } : undefined}
        onTouchField={isValidating ? onTouchField : undefined}
        onValidateField={isValidating ? onValidateField : undefined}
        quotationState={isValidating ? quotation.formState : undefined}
      />

      <ServicesTable
        services={quotation.services}
        addService={quotation.addService}
        removeService={quotation.removeService}
        updateService={quotation.updateService}
        readOnly={readOnly}
        error={isValidating ? errors?.noServices : undefined}
        serviceErrors={isValidating ? {
          serviceName: errors?.serviceName,
          serviceQuantity: errors?.serviceQuantity,
          servicePrice: errors?.servicePrice,
        } : undefined}
        touchedServices={isValidating ? touchedServices : undefined}
        onTouchServiceField={isValidating ? onTouchServiceField : undefined}
        onValidateServiceField={isValidating ? onValidateServiceField : undefined}
      />

      <PaymentSummary
        subtotal={quotation.subtotal}
        discount={quotation.discount}
        advance={quotation.advance}
        total={quotation.total}
        balance={quotation.balance}
        setDiscount={quotation.setDiscount}
        setAdvance={quotation.setAdvance}
        readOnly={readOnly}
        error={isValidating ? {
          discount: errors?.discountExceeds || '',
          advance: errors?.advanceExceeds || '',
        } : undefined}
        touched={isValidating ? paymentTouched : undefined}
        onTouchField={isValidating ? onTouchPaymentField : undefined}
        onValidateField={isValidating ? onValidatePaymentField : undefined}
      />

      <NotesSection
        notes={quotation.notes}
        onChange={quotation.setNotes}
        readOnly={readOnly}
      />

      <QuotationActions
        mode={mode}
        loading={loading}
        onUpdateQuotation={onUpdateQuotation}
        onSaveQuotation={onSaveQuotation}
        onGeneratePdf={onGeneratePdf}
        onCancel={onCancel}
        onEdit={onEdit}
      />
    </div>
  );
};

export default QuotationForm;
