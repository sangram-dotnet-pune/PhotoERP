import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Loader from '../../../components/ui/Loader';
import Textarea from '../../../components/ui/Textarea';
import Toggle from '../../../components/ui/Toggle';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import QuotationTemplate from '../../quotations/pdf/quotationTemplate';
import { resolveTemplateColors } from '../../quotations/pdf/decor';
import { buildSampleQuotation } from '../utils/sampleQuotation';

import { templateSettingsService } from '../../../services/templateSettings.service';
import { settingsService } from '../../../services/settings.service';
import {
  DEFAULT_TEMPLATE_SETTINGS,
  FONT_FAMILIES,
  HEADER_STYLES,
  TABLE_STYLES,
  TemplateSettings,
  Branding,
  DEFAULT_BRANDING,
} from '../../../types/templateSettings';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../../../types/settings';

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
    {children}
  </p>
);

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
        aria-label={label}
      />

      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">
          {label}
        </span>
        <span className="block text-xs uppercase text-slate-500">
          {value}
        </span>
      </span>
    </label>
  );
};

const StylePicker = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'rounded-lg border px-4 py-2 text-sm font-medium transition',
              value === option.value
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const QuotationTemplateSection = () => {
  const [template, setTemplate] = useState<TemplateSettings>(
    DEFAULT_TEMPLATE_SETTINGS,
  );
  const [savedTemplate, setSavedTemplate] = useState<TemplateSettings>(
    DEFAULT_TEMPLATE_SETTINGS,
  );
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [studio, setStudio] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();

    const refreshBranding = () => loadBranding();

    window.addEventListener('photoerp:branding-saved', refreshBranding);

    return () => {
      window.removeEventListener('photoerp:branding-saved', refreshBranding);
    };
  }, []);

  const loadBranding = async () => {
    try {
      setBranding(await templateSettingsService.getBranding());
    } catch (error) {
      console.error('Failed to load branding', error);
    }
  };

  const load = async () => {
    try {
      const [savedTemplate, studioData, brandingData] =
        await Promise.all([
          templateSettingsService.getTemplateSettings(),
          settingsService.getStudioSettings(),
          templateSettingsService.getBranding(),
        ]);

      setTemplate(savedTemplate);
      setSavedTemplate(savedTemplate);
      setStudio(studioData);
      setBranding(brandingData);
    } catch (error) {
      console.error('Failed to load template settings', error);
    } finally {
      setLoaded(true);
    }
  };

  const set = <K extends keyof TemplateSettings>(
    key: K,
    value: TemplateSettings[K],
  ) => {
    setTemplate((prev) => ({ ...prev, [key]: value }));
  };

  const dirty = useMemo(
    () => JSON.stringify(template) !== JSON.stringify(savedTemplate),
    [template, savedTemplate],
  );

  const handleSave = async () => {
    const toastId = toastLoading('Saving template...');

    try {
      setSaving(true);
      await templateSettingsService.saveTemplateSettings(template);
      setSavedTemplate(template);
      toastDismiss(toastId);
      toastSuccess('Quotation template saved and now used on quotations');
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);

      const message =
        typeof error === 'string' ? error : 'Failed to save template';
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTemplate(savedTemplate);
  };

  // The preview mirrors exactly what a real quotation renders: branding
  // colors are merged over the template colors on top.
  const previewTemplate = useMemo(
    () => resolveTemplateColors(template, branding),
    [template, branding],
  );

  const previewQuotation = useMemo(
    () => buildSampleQuotation(previewTemplate, studio),
    [previewTemplate, studio],
  );

  if (!loaded) {
    return (
      <Card>
        <Loader size="sm" text="Loading template settings..." />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <LayoutTemplate size={18} className="text-orange-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">
          Quotation Template
        </h2>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Customize the look of generated quotation PDFs. Changes apply to all
        new PDFs immediately.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <div className="space-y-4">
            <SectionLabel>Typography</SectionLabel>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="w-full">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Font Family
                </span>
                <select
                  value={template.font_family}
                  onChange={(e) => set('font_family', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>

              <Input
                label="Font Size (px)"
                type="number"
                min={8}
                max={48}
                value={template.font_size}
                onChange={(e) => set('font_size', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <SectionLabel>Colors</SectionLabel>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ColorField
                label="Primary"
                value={template.primary_color}
                onChange={(value) => set('primary_color', value)}
              />
              <ColorField
                label="Secondary"
                value={template.secondary_color}
                onChange={(value) => set('secondary_color', value)}
              />
              <ColorField
                label="Background"
                value={template.background_color}
                onChange={(value) => set('background_color', value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <SectionLabel>Layout</SectionLabel>

            <StylePicker
              label="Header Style"
              options={HEADER_STYLES}
              value={template.header_style}
              onChange={(value) =>
                set('header_style', value as TemplateSettings['header_style'])
              }
            />

            <StylePicker
              label="Services Table Style"
              options={TABLE_STYLES}
              value={template.service_table_style}
              onChange={(value) =>
                set(
                  'service_table_style',
                  value as TemplateSettings['service_table_style'],
                )
              }
            />

            <Input
              label="Quotation Title"
              value={template.quotation_title}
              onChange={(e) => set('quotation_title', e.target.value)}
              placeholder="QUOTATION"
            />
          </div>

          <div className="space-y-4">
            <SectionLabel>Spacing (px)</SectionLabel>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Page Margin"
                type="number"
                min={0}
                max={400}
                value={template.page_margin}
                onChange={(e) => set('page_margin', Number(e.target.value))}
              />
              <Input
                label="Header"
                type="number"
                min={0}
                max={400}
                value={template.header_spacing}
                onChange={(e) => set('header_spacing', Number(e.target.value))}
              />
              <Input
                label="Footer"
                type="number"
                min={0}
                max={400}
                value={template.footer_spacing}
                onChange={(e) => set('footer_spacing', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <SectionLabel>Sections</SectionLabel>

            <Toggle
              label="Show Quotation Meta"
              description="Quotation number and date."
              checked={template.show_quotation_meta}
              onChange={(e) => set('show_quotation_meta', e.target.checked)}
            />

            <Toggle
              label="Show Client Section"
              checked={template.show_client_section}
              onChange={(e) => set('show_client_section', e.target.checked)}
            />

            <Toggle
              label="Show Event Section"
              checked={template.show_event_section}
              onChange={(e) => set('show_event_section', e.target.checked)}
            />

            <Toggle
              label="Show Services Table"
              checked={template.show_services_section}
              onChange={(e) => set('show_services_section', e.target.checked)}
            />

            <Toggle
              label="Show Service Prices"
              description="Include the price column in the services table."
              checked={template.show_service_prices}
              onChange={(e) => set('show_service_prices', e.target.checked)}
            />

            <Toggle
              label="Show Totals"
              checked={template.show_totals_section}
              onChange={(e) => set('show_totals_section', e.target.checked)}
            />

            <Toggle
              label="Show Terms & Conditions"
              checked={template.show_terms}
              onChange={(e) => set('show_terms', e.target.checked)}
            />

            <Toggle
              label="Show Signature"
              description="Add an authorized signatory block."
              checked={template.show_signature}
              onChange={(e) => set('show_signature', e.target.checked)}
            />

            <Toggle
              label="Show Footer"
              checked={template.show_footer}
              onChange={(e) => set('show_footer', e.target.checked)}
            />

            <Toggle
              label="Show Footer Contact"
              description="Phone, email, website and social icons in the footer."
              checked={template.footer_contact}
              onChange={(e) => set('footer_contact', e.target.checked)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <SectionLabel>Content</SectionLabel>

            <Textarea
              label="Terms & Conditions (one per line)"
              rows={6}
              value={template.terms_and_conditions}
              onChange={(e) => set('terms_and_conditions', e.target.value)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Signature Name"
                value={template.signature_name}
                onChange={(e) => set('signature_name', e.target.value)}
                placeholder="Authorized Signatory"
              />
              <Input
                label="Signature Role"
                value={template.signature_role}
                onChange={(e) => set('signature_role', e.target.value)}
                placeholder="For studio"
              />
            </div>

            <Input
              label="Footer Text"
              value={template.footer_text}
              onChange={(e) => set('footer_text', e.target.value)}
              placeholder="Thank you for choosing us!"
            />
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SectionLabel>Live Preview</SectionLabel>

                {dirty ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                    role="status"
                  >
                    Unsaved changes
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                    role="status"
                  >
                    Saved &amp; in use
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {dirty && (
                  <Button
                    variant="outline"
                    leftIcon={<RotateCcw size={16} />}
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                )}

                <Button loading={saving} onClick={handleSave}>
                  Save Template
                </Button>
              </div>
            </div>

            <p className="mb-3 text-xs text-slate-400">
              Changes appear here first. They only start being used on new
              quotation PDFs after you click Save Template.
            </p>

            <div className="overflow-auto rounded-xl border border-slate-200 bg-white" style={{ maxHeight: 640 }}>
              <QuotationTemplate quotation={previewQuotation} preview />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QuotationTemplateSection;