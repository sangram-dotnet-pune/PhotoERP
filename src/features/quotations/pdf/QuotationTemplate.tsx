import { forwardRef } from 'react';
import clsx from 'clsx';
import './quotation.css';
import photoERP from './photoERP.jpg';

import QuotationHeader from './QuotationHeader';
import QuotationMeta from './QuotationMeta';
import ClientSection from './ClientSection';
import EventSection from './EventSection';
import ServicesSection from './ServicesSection';
import TotalsSection from './TotalsSection';
import Footer from './Footer';

import type { PdfQuotation } from './types';
import { buildPdfCssVars } from './decor';

interface Props {
  quotation: PdfQuotation;
  preview?: boolean;
}

const QuotationTemplate = forwardRef<HTMLDivElement, Props>(
  ({ quotation, preview = false }, ref) => {
    const template = quotation.template;
    const cssVars = buildPdfCssVars(template);

    const headerStyle = {
      paddingTop: `${template.header_spacing}px`,
      paddingBottom: `${template.header_spacing}px`,
    };

    const footerStyle = {
      marginTop: `${template.footer_spacing}px`,
    };

    const pageStyle = {
      ...cssVars,
      padding: template.page_margin > 0 ? `${template.page_margin}px` : undefined,
    };

    return (
      <div className={clsx('pdf-wrapper', preview && 'pdf-preview')}>
        <div ref={ref} className="pdf-page" style={pageStyle}>
          <div className="pdf-body">
            <div style={headerStyle}>
              <QuotationHeader
                floralBanner={photoERP}
                logo={quotation.logo}
                header_style={template.header_style}
                template={template}
                studioName={quotation.studio.name}
                ownerName={quotation.studio.ownerName}
              />
            </div>

            {template.show_quotation_meta && (
              <QuotationMeta
                quotationNo={quotation.quotationNo}
                quotationDate={quotation.quotationDate}
                validTill={quotation.validTill}
              />
            )}

            {(template.show_client_section || template.show_event_section) && (
              <div className="client-event-grid avoid-break">
                {template.show_client_section && (
                  <ClientSection client={quotation.client} />
                )}

                {template.show_event_section && (
                  <EventSection event={quotation.event} />
                )}
              </div>
            )}

            {template.show_services_section && (
              <ServicesSection
                services={quotation.services}
                showPrices={template.show_service_prices}
                tableStyle={template.service_table_style}
              />
            )}

            <TotalsSection
              subtotal={quotation.subtotal}
              discount={quotation.discount}
              advance={quotation.advance}
              total={quotation.total}
              balance={quotation.balance}
              template={template}
              studioName={quotation.studio.name}
            />
          </div>

          {template.show_footer && (
            <div style={footerStyle}>
              <Footer
                phone={quotation.studio.phone}
                email={quotation.studio.email}
                website={quotation.studio.website}
                footerText={template.footer_text}
                showContact={template.footer_contact}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

QuotationTemplate.displayName = 'QuotationTemplate';

export default QuotationTemplate;