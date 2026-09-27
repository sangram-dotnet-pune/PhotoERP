import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import Button from '../../../components/ui/Button';

import QuotationTemplate from '../pdf/QuotationTemplate';

import { quotationService } from '../../../services/quotation.service';

import type { PdfQuotation } from '../pdf/types';
import type { QuotationDto } from '../../../types/database';
import { mapQuotationToPdf } from '../../../utils/pdfMapper';

import generateQuotationPdf from '../pdf/generateQuotationPdf';
import { usePdfConfig } from '../../../hooks/usePdfConfig';
import { toastError, toastSuccess } from '../../../utils/toast';

const PdfPreviewPage = () => {
  const { id } = useParams();

  const pdfRef = useRef<HTMLDivElement>(null);
  const { config, studio, ready } = usePdfConfig();

  const [dto, setDto] = useState<QuotationDto | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadQuotation = async () => {
    try {
      const data = await quotationService.getQuotation(Number(id));
      setDto(data);
    } catch (err) {
      console.error(err);
      setError(true);
      toastError('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const quotation: PdfQuotation | null = useMemo(() => {
    if (!dto) return null;

    return mapQuotationToPdf(dto, {
      studio,
      template: config.template,
      branding: config.branding,
      logo: config.logo,
    });
  }, [dto, studio, config]);

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
    } catch (err) {
      console.error(err);

      toastError('Failed to generate PDF');
    }
  };

  if (loading || !ready) {
    return <p>Loading...</p>;
  }

  if (error || !quotation) {
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