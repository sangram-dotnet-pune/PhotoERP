import { useEffect, useState } from 'react';
import { ImageIcon, Palette, Trash2, Upload } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

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

const LogoBrandingSection = () => {
  const [logo, setLogo] = useState('');
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [logoData, savedBranding] = await Promise.all([
        templateSettingsService.getLogo(),
        templateSettingsService.getBranding(),
      ]);

      setLogo(logoData);
      setBranding(savedBranding);
    } catch (error) {
      console.error('Failed to load branding', error);
    } finally {
      setLoaded(true);
    }
  };

  const handleUpload = async () => {
    const selected = await open({
      title: 'Select Logo Image',
      multiple: false,
      directory: false,
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'],
        },
      ],
    });

    if (!selected || Array.isArray(selected)) return;

    const toastId = toastLoading('Uploading logo...');

    try {
      setUploading(true);
      await templateSettingsService.saveLogoFromPath(selected);
      const logoData = await templateSettingsService.getLogo();
      setLogo(logoData);
      toastDismiss(toastId);
      toastSuccess('Logo uploaded successfully');
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);

      const message =
        typeof error === 'string' ? error : 'Failed to upload logo';
      toastError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleClearLogo = async () => {
    const toastId = toastLoading('Removing logo...');

    try {
      await templateSettingsService.clearLogo();
      setLogo('');
      toastDismiss(toastId);
      toastSuccess('Logo removed');
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);
      toastError('Failed to remove logo');
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
        <ImageIcon size={18} className="text-purple-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">
          Logo &amp; Branding
        </h2>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Upload your studio logo and choose the brand colors used across the
        quotation template.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-start gap-4 rounded-xl border border-slate-200 p-4">
            {logo ? (
              <img
                src={logo}
                alt="Studio logo preview"
                className="h-20 w-20 rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <ImageIcon size={24} aria-hidden="true" />
              </div>
            )}

            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-slate-900">
                {logo ? 'Logo uploaded' : 'No logo uploaded'}
              </p>

              <p className="text-xs text-slate-500">
                PNG, JPG, WEBP, GIF or SVG up to 3 MB. Used in the quotation
                header when enabled.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  leftIcon={<Upload size={16} />}
                  loading={uploading}
                  onClick={handleUpload}
                >
                  Upload Logo
                </Button>

                {logo && (
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 size={16} />}
                    onClick={handleClearLogo}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
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
      </div>
    </Card>
  );
};

export default LogoBrandingSection;