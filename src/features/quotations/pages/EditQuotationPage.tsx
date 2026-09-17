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
      toastError('Please fix the errors before updating');
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
      />

      <PdfPreview ref={pdfRef} quotation={pdfQuotation} />
    </>
  );
};

export default EditQuotationPage;