import html2pdf from 'html2pdf.js';

interface GeneratePdfOptions {
  element: HTMLElement;
  fileName: string;
}

/**
 * Make sure every font used by the template is loaded BEFORE html2canvas
 * measures the layout. Otherwise text is measured in a fallback font and
 * painted in the real one, which shifts it relative to the icons.
 * Add a line here for any other template font you use (Inter, Lato, Playfair Display).
 */
const waitForFonts = async () => {
  if (typeof document === 'undefined' || !document.fonts) return;

  try {
    await Promise.all([
      document.fonts.load('400 13.5px Poppins'),
      document.fonts.load('500 13.5px Poppins'),
      document.fonts.load('600 13.5px Poppins'),
      document.fonts.load('700 30px Poppins'),
      document.fonts.load('600 50px "Dancing Script"'),
      document.fonts.load('700 50px "Dancing Script"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Don't block PDF generation if a font fails to load
  }
};

const generateQuotationPdf = async ({
  element,
  fileName,
}: GeneratePdfOptions) => {
  await waitForFonts();

  const options = {
    margin: 0,
    filename: `${fileName}.pdf`,
    image: {
      type: 'jpeg' as const,
      quality: 0.98,
    },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FDFAF8',
      logging: false,
      windowWidth: 794, // Standard A4 width in pixels at 96 DPI
      // html2canvas paints Poppins text lower than the browser lays it out.
      // Flag the cloned page so CSS can compensate ONLY in the exported PDF
      // (the on-screen preview stays untouched).
      onclone: (clonedDoc: Document) => {
        clonedDoc
          .querySelectorAll('.pdf-page')
          .forEach((el) => el.classList.add('pdf-capture'));
      },
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
    },
    // Multi-page automatic page break configuration
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      avoid: [
        '.avoid-break',
        '.client-event-grid',
        '.totals-section',
        '.quotation-header',
        '.quotation-footer',
        'tr',
      ],
    },
  };

  await html2pdf().set(options).from(element).save();
};

export default generateQuotationPdf;