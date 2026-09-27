import type { TemplateSettings } from '../../../types/templateSettings';

interface TotalsSectionProps {
  subtotal: number;
  discount: number;
  advance: number;
  total: number;
  balance: number;
  template: TemplateSettings;
  studioName: string;
}

const TotalsSection = ({
  subtotal,
  advance,
  total,
  balance,
  template,
  studioName,
}: TotalsSectionProps) => {
  const terms = template.terms_and_conditions
    .split('\n')
    .map((term) => term.trim())
    .filter(Boolean);

  return (
    <>
      {template.show_totals_section && (
        <section className="totals-section">
          {template.show_terms && (
            <div className="terms-section">
              <h3>TERMS &amp; CONDITIONS</h3>

              <ul>
                {terms.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="amount-section">
            <div className="amount-row">
              <span>Subtotal</span>
              <strong>₹ {subtotal.toLocaleString('en-IN')}</strong>
            </div>

            <div className="amount-row">
              <span>Advance</span>
              <strong>₹ {advance.toLocaleString('en-IN')}</strong>
            </div>

            <div className="amount-row balance-row">
              <span>Balance</span>
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

export default TotalsSection;