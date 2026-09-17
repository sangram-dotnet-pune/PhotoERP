import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import QuotationForm from '../components/QuotationForm';
import Card from '../../../components/ui/Card';
import BackNavigation from '../../../components/ui/BackNavigation';
import LoadingState from '../../../components/ui/LoadingState';
import { ROUTES } from '../../../constants/routes';

import { useQuotation } from '../hooks/useQuotation';
import { quotationService } from '../../../services/quotation.service';

import { mapQuotationToDto } from '../../../utils/quotationMapper';
import { mapQuotationToPdf } from '../../../utils/pdfMapper';

import generateQuotationPdf from '../pdf/generateQuotationPdf';
import PdfPreview from '../pdf/PdfPreview';
import { useStudioSettings } from '../../../hooks/useStudioSettings';
import { toastError, toastSuccess } from '../../../utils/toast';
import { WORKFLOW_STATUSES } from '../../../types/settings';

const WORKFLOW_COLORS: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Sent: 'bg-blue-100 text-blue-700',
  Confirmed: 'bg-indigo-100 text-indigo-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const ViewQuotationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const quotation = useQuotation();
  const studio = useStudioSettings();

  const pdfRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    loadQuotation();
  }, []);

  const loadQuotation = async () => {
    if (!id) return;

    try {
      const data = await quotationService.getQuotation(Number(id));

      quotation.loadQuotation(data);
    } catch (err) {
      console.error(err);

      toastError('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const pdfQuotation = mapQuotationToPdf(
    mapQuotationToDto(quotation.formState),
    studio,
  );

  const handleGeneratePdf = async () => {
    if (!pdfRef.current) return;

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

  const handleStatusChange = async (status: string) => {
    if (!id || status === quotation.status) return;

    try {
      await quotationService.updateStatus(Number(id), status);

      quotation.setStatus(status);

      toastSuccess(`Quotation marked as ${status}`);
    } catch (error) {
      console.error(error);

      toastError('Failed to update quotation status');
    }
  };

  if (loading) {
    return <LoadingState text="Loading quotation..." />;
  }

  return (
    <>
      <div className="mb-6">
        <BackNavigation
          fallbackPath={ROUTES.QUOTATIONS}
          label="Back to Quotations"
        />

        <Card title="Quotation Status">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={`inline-block rounded-full px-4 py-1.5 text-sm font-semibold ${
                WORKFLOW_COLORS[quotation.status] ||
                'bg-slate-100 text-slate-700'
              }`}
            >
              {quotation.status}
            </span>

            <select
              value={quotation.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              aria-label="Change quotation status"
            >
              {WORKFLOW_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </div>

      <QuotationForm
        quotation={quotation}
        mode="view"
        loading={pdfLoading}
        onGeneratePdf={handleGeneratePdf}
        onCancel={() => navigate(-1)}
        onEdit={() => navigate(`/quotations/edit/${id}`)}
      />

      <PdfPreview ref={pdfRef} quotation={pdfQuotation} />
    </>
  );
};

export default ViewQuotationPage;