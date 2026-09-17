import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import Button from '../../../components/ui/Button';

import QuotationTemplate from '../pdf/QuotationTemplate';

import { quotationService } from '../../../services/quotation.service';

import type { PdfQuotation } from '../pdf/types';
import { mapQuotationToPdf } from '../../../utils/pdfMapper';

import generateQuotationPdf from '../pdf/generateQuotationPdf';
import { useStudioSettings } from '../../../hooks/useStudioSettings';
import { toastError, toastSuccess } from '../../../utils/toast';

const PdfPreviewPage = () => {
  const { id } = useParams();

  const pdfRef = useRef<HTMLDivElement>(null);
  const studio = useStudioSettings();

  const [quotation, setQuotation] =
    useState<PdfQuotation>();

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuotation = async () => {
    try {
      const dto =
        await quotationService.getQuotation(
          Number(id),
        );

      setQuotation(
        mapQuotationToPdf(dto, studio),
      );
    } catch (error) {
      console.error(error);

      toastError('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!pdfRef.current || !quotation) {
      return;
    }

    try {
      await generateQuotationPdf({
        element: pdfRef.current,
        fileName: quotation.quotationNo,
      });

      toastSuccess('PDF generated successfully');
    } catch (error) {
      console.error(error);

      toastError('Failed to generate PDF');
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!quotation) {
    return <p>Quotation not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleGeneratePdf}>
          Download PDF
        </Button>
      </div>

      <QuotationTemplate
        ref={pdfRef}
        quotation={quotation}
      />
    </div>
  );
};

export default PdfPreviewPage;