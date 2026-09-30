import { forwardRef } from 'react';

import QuotationTemplate from './quotationTemplate';

import type { PdfQuotation } from './types';


interface Props {
  quotation: PdfQuotation;
}


const PdfPreview = forwardRef<HTMLDivElement, Props>(
  ({ quotation }, ref) => {

    // Forward the ref directly into QuotationTemplate so callers receive the
    // inner .pdf-page element (which has the actual A4 dimensions and layout)
    // instead of an outer wrapper div with no explicit size.
    return (
      <QuotationTemplate
        ref={ref}
        quotation={quotation}
      />
    );

  }
);


PdfPreview.displayName = 'PdfPreview';


export default PdfPreview;