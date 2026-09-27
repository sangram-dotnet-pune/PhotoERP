import type { HeaderStyle, TemplateSettings } from '../../../types/templateSettings';

interface Props {
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
}: Props) => {
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
}: Props) => {
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
}: Props) => {
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

const QuotationHeader = ({ header_style, ...rest }: Props) => {
  if (header_style === 'minimal') return <MinimalHeader {...rest} />;
  if (header_style === 'modern') return <ModernHeader {...rest} />;
  return <ClassicHeader {...rest} />;
};

export default QuotationHeader;