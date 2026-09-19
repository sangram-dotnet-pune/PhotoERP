import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { confirm } from '@tauri-apps/plugin-dialog';

import QuotationForm from '../components/QuotationForm';
import BackNavigation from '../../../components/ui/BackNavigation';
import { ROUTES } from '../../../constants/routes';

import { useQuotation } from '../hooks/useQuotation';
import { useQuotationValidation } from '../hooks/useQuotationValidation';

import { quotationService } from '../../../services/quotation.service';
import { clientService } from '../../../services/client.service';

import { mapQuotationToDto } from '../../../utils/quotationMapper';
import { mapQuotationToPdf } from '../../../utils/pdfMapper';

import generateQuotationPdf from '../pdf/generateQuotationPdf';
import PdfPreview from '../pdf/PdfPreview';
import { useStudioSettings } from '../../../hooks/useStudioSettings';
import { toastDismiss, toastError, toastLoading, toastSuccess } from '../../../utils/toast';

const NewQuotationPage = () => {
  const navigate = useNavigate();
  const quotation = useQuotation();
  const validation = useQuotationValidation();
  const studio = useStudioSettings();

  const pdfRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);

  const pdfQuotation = mapQuotationToPdf(
    mapQuotationToDto(quotation.formState),
    studio,
  );

  const handleSaveQuotation = async () => {
    const isValid = validation.validate(quotation.formState);
    if (!isValid) {
      touchAllServiceAndPaymentFields();
      toastError('Please fill in all required fields before continuing.');
      focusFirstInvalidField();
      return;
    }

    const toastId = toastLoading('Saving quotation...');

    try {
      setLoading(true);

      const dto = mapQuotationToDto(quotation.formState);

      if (!dto.client_id) {
        const match = await clientService.findClientByContact(
          dto.client.phone,
          dto.client.email,
        );

        if (match) {
          const useExisting = await confirm(
            `A client named "${match.name}" already exists with this phone/email.\n\nUse the existing client for this quotation?`,
            {
              title: 'Existing Client Found',
              kind: 'info',
              okLabel: 'Use Existing',
              cancelLabel: 'Create New',
            },
          );

          if (useExisting) {
            quotation.selectClient(match);
            dto.client_id = match.id;
          }
        }
      }

      await quotationService.saveQuotation(dto);

      validation.clearErrors();
      toastDismiss(toastId);
      toastSuccess('Quotation saved successfully');
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError('Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    const isValid = validation.validate(quotation.formState);
    if (!isValid) {
      touchAllServiceAndPaymentFields();
      toastError('Please fill in all required fields before generating PDF.');
      focusFirstInvalidField();
      return;
    }

    if (!pdfRef.current) {
      toastError('PDF preview not available');
      return;
    }

    try {
      await generateQuotationPdf({
        element: pdfRef.current,
        fileName: pdfQuotation.quotationNo,
      });

      toastSuccess('PDF generated successfully');
    } catch (error) {
      console.error(error);

      toastError('Failed to generate PDF');
    }
  };

  const touchAllServiceAndPaymentFields = () => {
    quotation.services.forEach((s) => {
      quotation.touchServiceField(s.id, 'name');
      quotation.touchServiceField(s.id, 'quantity');
      quotation.touchServiceField(s.id, 'price');
    });
    quotation.touchPaymentField('discount');
    quotation.touchPaymentField('advance');
  };

  const focusFirstInvalidField = () => {
    const errors = validation.errors;
    const errorFields = Object.entries(errors).filter(([, value]) => value);
    if (errorFields.length === 0) return;

    const firstError = errorFields[0][0];

    const servicePrefixMap: Record<string, string> = {
      serviceName: 'service-name-',
      serviceQuantity: 'service-quantity-',
      servicePrice: 'service-price-',
    };

    const servicePrefix = servicePrefixMap[firstError];
    if (servicePrefix) {
      const input = document.querySelector(`input[name^="${servicePrefix}"]`);
      if (input) {
        (input as HTMLElement).focus();
        (input as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Map error keys to input IDs or selectors
    const fieldMap: Record<string, string> = {
      clientName: 'client-name',
      clientPhone: 'client-phone',
      clientEmail: 'client-email',
      eventType: 'event-type',
      eventDate: 'event-date',
      discountExceeds: 'discount',
      advanceExceeds: 'advance',
    };

    const inputId = fieldMap[firstError];
    if (inputId) {
      const input = document.getElementById(inputId) || document.querySelector(`[name="${inputId}"]`);
      if (input) {
        (input as HTMLElement).focus();
        (input as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <>
      <BackNavigation
        fallbackPath={ROUTES.QUOTATIONS}
        label="Back to Quotations"
      />

      <QuotationForm
        quotation={quotation}
        mode="create"
        loading={loading}
        onSaveQuotation={handleSaveQuotation}
        onGeneratePdf={handleGeneratePdf}
        onCancel={() => navigate(-1)}
        errors={validation.errors}
        touched={validation.touched}
        onTouchField={validation.touchField}
        onValidateField={validation.validateField}
        touchedServices={quotation.touchedServices}
        onTouchServiceField={quotation.touchServiceField}
        onValidateServiceField={validation.validateServiceField}
        paymentTouched={quotation.paymentTouched}
        onTouchPaymentField={quotation.touchPaymentField}
        onValidatePaymentField={validation.validatePaymentField}
      />

      <PdfPreview ref={pdfRef} quotation={pdfQuotation} />
    </>
  );
};

export default NewQuotationPage;