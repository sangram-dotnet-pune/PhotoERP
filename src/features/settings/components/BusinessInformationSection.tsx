import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Loader from '../../../components/ui/Loader';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import { settingsService } from '../../../services/settings.service';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../../../types/settings';

const BusinessInformationSection = () => {
  const [studio, setStudio] = useState<StudioSettings>(
    DEFAULT_STUDIO_SETTINGS,
  );
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService
      .getStudioSettings()
      .then(setStudio)
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    if (!studio.studio_name.trim()) {
      toastError('Studio name is required');
      return;
    }

    const toastId = toastLoading('Saving settings...');

    try {
      setSaving(true);
      await settingsService.saveStudioSettings(studio);
      toastDismiss(toastId);
      toastSuccess('Settings saved successfully');
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);
      toastError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Building2 size={18} className="text-blue-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">
          Business Information
        </h2>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        These details are shown on generated quotation PDFs.
      </p>

      {!loaded ? (
        <div className="mt-4">
          <Loader size="sm" text="Loading settings..." />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Studio Name"
            value={studio.studio_name}
            onChange={(e) =>
              setStudio((prev) => ({ ...prev, studio_name: e.target.value }))
            }
            required
            aria-required="true"
          />

          <Input
            label="Owner Name"
            value={studio.owner_name}
            onChange={(e) =>
              setStudio((prev) => ({ ...prev, owner_name: e.target.value }))
            }
            placeholder="Owner / studio head name"
          />

          <Input
            label="Phone"
            value={studio.studio_phone}
            onChange={(e) =>
              setStudio((prev) => ({ ...prev, studio_phone: e.target.value }))
            }
            type="tel"
            placeholder="10-digit mobile number"
          />

          <Input
            label="Email"
            type="email"
            value={studio.studio_email}
            onChange={(e) =>
              setStudio((prev) => ({ ...prev, studio_email: e.target.value }))
            }
            placeholder="example@email.com"
          />

          <Input
            label="Website"
            value={studio.studio_website}
            onChange={(e) =>
              setStudio((prev) => ({ ...prev, studio_website: e.target.value }))
            }
            placeholder="https://example.com"
          />

          <div className="md:col-span-2">
            <Input
              label="Address"
              value={studio.studio_address}
              onChange={(e) =>
                setStudio((prev) => ({ ...prev, studio_address: e.target.value }))
              }
              placeholder="Studio address"
            />
          </div>

          <div className="md:col-span-2">
            <Button loading={saving} onClick={handleSave}>
              Save Studio Details
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default BusinessInformationSection;