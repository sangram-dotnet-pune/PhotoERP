import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import QuotationForm from '../components/QuotationForm';
import BackNavigation from '../../../components/ui/BackNavigation';
import LoadingState from '../../../components/ui/LoadingState';
import { ROUTES } from '../../../constants/routes';

import { useQuotation } from '../hooks/useQuotation';
import { useQuotationValidation } from '../hooks/useQuotationValidation';
import { quotationService } from '../../../services/quotation.service';
import { QuotationDto } from '../../../types/database';
import { mapQuotationToDto } from '../../../utils/quotationMapper';
import { mapQuotationToPdf } from '../../../utils/pdfMapper';
import generateQuotationPdf from '../pdf/generateQuotationPdf';
import PdfPreview from '../pdf/PdfPreview';
import { useStudioSettings } from '../../../hooks/useStudioSettings';
import {
  toastDismiss,
  toastError,
  toastLoading,
  toastSuccess,
} from '../../../utils/toast';

const EditQuotationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  const quotation = useQuotation();
  const validation = useQuotationValidation();
  const studio = useStudioSettings();

  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, []);

  const loadQuotation = async () => {
    if (!id) return;

    try {
      const data: QuotationDto = await quotationService.getQuotation(Number(id));

      quotation.loadQuotation(data);
    } catch (error) {
      console.error(error);

      toastError('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuotation = async () => {
    const isValid = validation.validate(quotation.formState);
    if (!isValid) {
      touchAllServiceAndPaymentFields();
      toastError('Please fill in all required fields before continuing.');
      focusFirstInvalidField();
      return;
    }

    const toastId = toastLoading('Updating quotation...');

    try {
      const dto = mapQuotationToDto(quotation.formState);

      await quotationService.updateQuotation(dto);

      validation.clearErrors();
      toastDismiss(toastId);
      toastSuccess('Quotation updated successfully');
      navigate(-1);
    } catch (err) {
      console.error(err);

      toastDismiss(toastId);
      toastError('Failed to update quotation');
    }
  };

  const pdfQuotation = mapQuotationToPdf(
    mapQuotationToDto(quotation.formState),
    studio,
  );

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

    setPdfLoading(true);

    try {
      await document.fonts.ready;

      const images = Array.from(pdfRef.current.querySelectorAll('img'));

      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }),
      );

      await generateQuotationPdf({
        element: pdfRef.current,
        fileName: pdfQuotation.quotationNo,
      });

      toastSuccess('PDF generated successfully');
    } catch (error) {
      console.error(error);

      toastError('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
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

  if (loading) {
    return <LoadingState text="Loading quotation..." />;
  }

  return (
    <>
      <BackNavigation
        fallbackPath={ROUTES.QUOTATIONS}
        label="Back to Quotation"
      />

      <QuotationForm
        quotation={quotation}
        loading={pdfLoading}
        mode="edit"
        onUpdateQuotation={handleUpdateQuotation}
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

export default EditQuotationPage;