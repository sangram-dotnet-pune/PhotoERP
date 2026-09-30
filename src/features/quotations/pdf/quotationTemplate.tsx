import { forwardRef } from 'react';
import { Camera } from 'lucide-react';
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from 'react-icons/fa';
import clsx from 'clsx';
import './quotationTemplate.css';
import photoERP from './photoERP.jpg';

import type { CSSProperties, ReactNode } from 'react';

import type {
  HeaderStyle,
  ServiceTableStyle,
  TemplateSettings,
} from '../../../types/templateSettings';
import type { PdfQuotation } from './types';

type Client = PdfQuotation['client'];
type Event = PdfQuotation['event'];
type Service = PdfQuotation['services'][number];

/**
 * All small icons are encoded as SVG data URIs and rendered through <img>
 * instead of embedded <svg> elements so html2canvas can rasterise them
 * reliably (and at a predictable position) when the PDF is generated.
 */
const svgToDataUri = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const iconUri = (inner: string, color: string): string =>
  svgToDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`,
  );

const STAR_PATH =
  '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>';
const CALENDAR_PATH =
  '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>';
const CLOCK_PATH =
  '<circle cx="12" cy="12" r="10"/><path d="M12 6v6h4"/>';
const PIN_PATH =
  '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>';
const PHONE_PATH =
  '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>';
const MAIL_PATH =
  '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>';

const ROSE = '#B97862';
const WHITE = '#FFFFFF';

const starUri = iconUri(STAR_PATH, ROSE);
const calendarUri = iconUri(CALENDAR_PATH, ROSE);
const clock3Uri = iconUri(CLOCK_PATH, ROSE);
const mapPinUri = iconUri(PIN_PATH, ROSE);

const phoneRose = iconUri(PHONE_PATH, ROSE);
const mailRose = iconUri(MAIL_PATH, ROSE);
const pinRose = iconUri(PIN_PATH, ROSE);
const phoneWhite = iconUri(PHONE_PATH, WHITE);
const mailWhite = iconUri(MAIL_PATH, WHITE);

/**
 * One icon + text row. Used for client contact and footer contact.
 * Icon box and text share the same 20px height and are top-aligned, so
 * the layout does not depend on flex vertical centering (which html2canvas
 * renders differently for text vs. images).
 */
const IconRow = ({
  icon,
  children,
}: {
  icon: string;
  children: ReactNode;
}) => (
  <div className="icon-row">
    <span className="icon-box">
      <img src={icon} width={16} height={16} alt="" />
    </span>
    <span className="icon-text">{children}</span>
  </div>
);

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const cleaned = hex.replace('#', '');

  if (cleaned.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return null;
  }

  const num = parseInt(cleaned, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const mixWithWhite = (hex: string, factor: number): string => {
  const rgb = hexToRgb(hex);

  if (!rgb) return hex;

  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * factor);

  const toHex = (value: number) =>
    value.toString(16).padStart(2, '0');

  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
};

/**
 * Convert the template settings into CSS custom properties applied on the
 * A4 page so every section of the PDF picks up the custom theme.
 */
const buildPdfCssVars = (template: TemplateSettings): CSSProperties => {
  const primary = template.primary_color;
  const secondary = template.secondary_color;
  const background = template.background_color;

  const vars: Record<string, string | number> = {
    '--rose': primary,
    '--rose-dark': secondary,
    '--cream': mixWithWhite(background, 0.5),
    '--pink': mixWithWhite(primary, 0.82),
    '--pink-light': mixWithWhite(primary, 0.9),
    '--border': mixWithWhite(primary, 0.72),
    '--font-main': `'${template.font_family}', Arial, sans-serif`,
  };

  if (template.font_size > 0) {
    vars.fontSize = `${template.font_size}px`;
  }

  return vars as CSSProperties;
};

interface HeaderProps {
  floralBanner: string;
  logo: string;
  template: TemplateSettings;
  studioName: string;
  ownerName: string;
  header_style?: HeaderStyle;
}

const ClassicHeader = ({
  floralBanner,
  logo,
  template,
  studioName,
}: HeaderProps) => {
  return (
    <header className="quotation-header">
      <div className="header-glow" />

      <div className="decor-circle circle-one" />
      <div className="decor-circle circle-two" />

      <div className="logo-container">
        {logo ? (
          <img src={logo} alt={studioName} className="logo-image" />
        ) : (
          <div>
            <p className="brand-name">{studioName}</p>
            <p className="brand-subtitle">{template.quotation_title}</p>
          </div>
        )}
      </div>

      <div className="quotation-title">
        <p className="photo-title">PHOTOGRAPHY</p>
        <h1>{template.quotation_title}</h1>
        <p className="tagline">
          We don't just take photos,
          <br />
          we create memories.
        </p>
      </div>

      <div className="floral-image">
        <div className="image-card">
          <img src={floralBanner} alt="Floral Banner" />
        </div>
      </div>
    </header>
  );
};

const MinimalHeader = ({
  logo,
  template,
  studioName,
  ownerName,
}: HeaderProps) => {
  return (
    <header className="quotation-header header-minimal">
      <div className="header-brand-row">
        <div className="header-brand">
          {logo && (
            <img src={logo} alt={studioName} className="header-brand-logo" />
          )}

          <div>
            <p className="header-brand-name">{studioName}</p>
            {ownerName && (
              <p className="header-brand-owner">{ownerName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="header-title-block">
        <h1 className="header-title-main">{template.quotation_title}</h1>
        <p className="header-title-sub">Photography &amp; Cinematography</p>
      </div>
    </header>
  );
};

const ModernHeader = ({
  logo,
  template,
  studioName,
}: HeaderProps) => {
  return (
    <header className="quotation-header header-modern">
      <div className="modern-band">
        <div className="modern-band-top">
          <p className="modern-brand-name">{studioName}</p>

          {logo && (
            <img src={logo} alt={studioName} className="modern-logo" />
          )}
        </div>

        <div className="modern-title-block">
          <p className="modern-title-sub">PHOTOGRAPHY &amp; CINEMATOGRAPHY</p>
          <h1 className="modern-title-main">{template.quotation_title}</h1>
          <div className="modern-underline" />
        </div>
      </div>

      <div className="modern-notch" />
    </header>
  );
};

const TemplateHeader = ({ header_style, ...rest }: HeaderProps) => {
  if (header_style === 'minimal') return <MinimalHeader {...rest} />;
  if (header_style === 'modern') return <ModernHeader {...rest} />;
  return <ClassicHeader {...rest} />;
};

interface MetaProps {
  quotationNo: string;
  quotationDate: string;
  validTill: string;
}

const MetaSection = ({
  quotationNo,
  quotationDate,
}: MetaProps) => {
  const rows = [
    {
      label: 'Quotation No.',
      value: quotationNo,
    },
    {
      label: 'Date',
      value: quotationDate,
    },
  ];

  return (
    <section className="quotation-meta">
      <div className="meta-list">
        {rows.map((row) => (
          <div
            key={row.label}
            className="meta-row"
          >
            <span className="meta-label">
              {row.label}
            </span>

            <span className="meta-colon">
              :
            </span>

            <span className="meta-value">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

const ClientSection = ({
  client,
}: {
  client: Client;
}) => {
  return (
    <div className="client-section">
      <p className="client-label">
        TO
      </p>

      <h2
        className="client-name"
      >
        {client.name}
      </h2>

      <div className="client-contact">
        <IconRow icon={phoneRose}>{client.phone}</IconRow>
        <IconRow icon={mailRose}>{client.email}</IconRow>
        <IconRow icon={pinRose}>{client.address}</IconRow>
      </div>
    </div>
  );
};

interface EventRowProps {
  icon: string;
  label: string;
  value: string;
}

const EventRow = ({ icon, label, value }: EventRowProps) => (
  <div className="event-row">
    <span className="icon-box">
      <img src={icon} width={16} height={16} alt="" />
    </span>

    <span className="event-label">{label}</span>
    <span className="event-colon">:</span>
    <span className="event-value">{value}</span>
  </div>
);

const EventSection = ({
  event,
}: {
  event: Event;
}) => {
  return (
    <div className="event-section">
      <p className="event-title">
        EVENT DETAILS
      </p>

      <EventRow
        icon={starUri}
        label="Event Type"
        value={event.eventType}
      />

      <EventRow
        icon={calendarUri}
        label="Event Date"
        value={event.eventDate}
      />

      {event.eventTime && (
        <EventRow
          icon={clock3Uri}
          label="Event Time"
          value={event.eventTime}
        />
      )}

      <EventRow
        icon={mapPinUri}
        label="Venue"
        value={[event.venue, event.city].filter(Boolean).join(', ')}
      />

      {event.eventNotes && (
        <EventRow
          icon={starUri}
          label="Notes"
          value={event.eventNotes}
        />
      )}
    </div>
  );
};

const ServicesSection = ({
  services,
  showPrices,
  tableStyle,
}: {
  services: Service[];
  showPrices: boolean;
  tableStyle: ServiceTableStyle;
}) => {
  const tableClass =
    tableStyle === 'bordered'
      ? 'package-table package-table-bordered'
      : tableStyle === 'minimal'
        ? 'package-table package-table-minimal'
        : 'package-table';

  return (
    <section className="package-section">
      {tableStyle === 'ribbon' && (
        <div className="package-ribbon">PACKAGE DETAILS</div>
      )}

      <table className={tableClass}>
        <thead>
          <tr>
            <th className="icon-column"></th>
            <th className="description-column">Description</th>

            {showPrices && (
              <th className="price-column">Price (₹)</th>
            )}
          </tr>
        </thead>

        <tbody>
          {services.length === 0 ? (
            <tr>
              <td colSpan={showPrices ? 3 : 2} className="empty-row">
                No services added.
              </td>
            </tr>
          ) : (
            services.map((service) => (
              <tr key={service.id}>
                <td>
                  <div className="service-icon">
                    <Camera size={18} />
                  </div>
                </td>

                <td className="service-name">{service.serviceName}</td>

                {showPrices && (
                  <td className="service-price">
                    ₹{' '}
                    {service.price.toLocaleString('en-IN')}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
};

interface TotalsProps {
  subtotal: number;
  discount: number;
  advance: number;
  total: number;
  balance: number;
  notes: string;
  template: TemplateSettings;
  studioName: string;
}

const TotalsSection = ({
  advance,
  total,
  balance,
  notes,
  template,
  studioName,
}: TotalsProps) => {
  const terms = template.terms_and_conditions
    .split('\n')
    .map((term) => term.trim())
    .filter(Boolean);

  const trimmedNotes = notes.trim();

  const hasSummary =
    template.show_totals_section ||
    Boolean(trimmedNotes) ||
    template.show_terms;

  return (
    <>
      {hasSummary && (
        <div className="totals-layout">
          <div className="totals-column-left">
            {trimmedNotes && (
              <section className="terms-notes-section">
                <h3>DELIVERABLES FROM US</h3>

                <p>{notes}</p>
              </section>
            )}

            {template.show_terms && (
              <section className="terms-section">
                <h3>TERMS &amp; CONDITIONS</h3>

                <ul>
                  {terms.map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="totals-column-right">
            {template.show_totals_section && (
              <section className="totals-section">
                <div className="amount-section">
                  <div className="amount-row">
                    <span>Subtotal</span>
                    <strong>₹ {total.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="amount-row">
                    <span>Advance</span>
                    <strong>₹ {advance.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="amount-row balance-row">
                    <span>Remaining</span>
                    <strong>₹ {balance.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="grand-total">
                    <div>
                      <span>TOTAL (₹)</span>
                      <strong>{total.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {template.show_signature && (
        <section className="signature-section avoid-break">
          <div className="signature-grid">
            <div className="signature-block">
              <div className="signature-spacer" />
              <div className="signature-line" />
              <p className="signature-name">
                {template.signature_name || 'Authorized Signatory'}
              </p>
              <p className="signature-role">
                {template.signature_role || `For ${studioName}`}
              </p>
            </div>

            <div className="signature-block">
              <div className="signature-spacer" />
              <div className="signature-line" />
              <p className="signature-name">Client Signature</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

const Footer = ({
  phone,
  email,
  footerText,
  showContact,
}: {
  phone: string;
  email: string;
  footerText: string;
  showContact: boolean;
}) => {
  return (
    <footer className="quotation-footer">
      <div className="footer-content">
        {showContact ? (
          <>
            <div className="footer-contact">
              <IconRow icon={phoneWhite}>{phone}</IconRow>
              <IconRow icon={mailWhite}>{email}</IconRow>
            </div>

            <div className="social-icons">
              <div className="social-circle">
                <FaInstagram size={16} />
              </div>

              <div className="social-circle">
                <FaFacebookF size={16} />
              </div>

              <div className="social-circle">
                <FaYoutube size={16} />
              </div>
            </div>

            <div
              className="thank-you"
              style={{
                fontFamily:
                  "'Dancing Script', cursive",
              }}
            >
              {footerText}
            </div>
          </>
        ) : (
          <div
            className="thank-you"
            style={{
              fontFamily: "'Dancing Script', cursive",
              textAlign: 'center',
            }}
          >
            {footerText}
          </div>
        )}
      </div>
    </footer>
  );
};

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
              <TemplateHeader
                floralBanner={photoERP}
                logo={quotation.logo}
                header_style={template.header_style}
                template={template}
                studioName={quotation.studio.name}
                ownerName={quotation.studio.ownerName}
              />
            </div>

            {template.show_quotation_meta && (
              <MetaSection
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
              notes={quotation.notes}
              template={template}
              studioName={quotation.studio.name}
            />
          </div>

          {template.show_footer && (
            <div style={footerStyle}>
              <Footer
                phone={quotation.studio.phone}
                email={quotation.studio.email}
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