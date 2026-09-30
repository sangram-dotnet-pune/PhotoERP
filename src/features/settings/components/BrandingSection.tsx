import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Loader from '../../../components/ui/Loader';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import { templateSettingsService } from '../../../services/templateSettings.service';
import {
  DEFAULT_BRANDING,
  Branding,
} from '../../../types/templateSettings';

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
    <label className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1"
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

const BrandingSection = () => {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setBranding(await templateSettingsService.getBranding());
    } catch (error) {
      console.error('Failed to load branding', error);
    } finally {
      setLoaded(true);
    }
  };

  const handleSaveBranding = async () => {
    const toastId = toastLoading('Saving branding...');

    try {
      setSaving(true);
      await templateSettingsService.saveBranding(branding);
      window.dispatchEvent(new Event('photoerp:branding-saved'));
      toastDismiss(toastId);
      toastSuccess('Branding saved successfully');
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);
      toastError('Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <Card>
        <Loader size="sm" text="Loading branding..." />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Palette size={18} className="text-purple-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">Branding</h2>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Choose the brand colors used across the quotation template.
      </p>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-slate-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">
            Brand Colors
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ColorField
            label="Primary Color"
            value={branding.primary_color}
            onChange={(value) =>
              setBranding((prev) => ({ ...prev, primary_color: value }))
            }
          />

          <ColorField
            label="Secondary Color"
            value={branding.secondary_color}
            onChange={(value) =>
              setBranding((prev) => ({ ...prev, secondary_color: value }))
            }
          />
        </div>

        <Button loading={saving} onClick={handleSaveBranding}>
          Save Brand Colors
        </Button>
      </div>
    </Card>
  );
};

export default BrandingSection;