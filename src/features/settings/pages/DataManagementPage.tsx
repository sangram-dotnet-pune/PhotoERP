import { useEffect, useState } from 'react';
import {
  Download,
  Upload,
  Database,
  ShieldAlert,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';
import {
  save,
  open,
  confirm,
} from '@tauri-apps/plugin-dialog';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Loader from '../../../components/ui/Loader';
import BackNavigation from '../../../components/ui/BackNavigation';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import { dataManagementService } from '../../../services/dataManagement.service';
import { settingsService } from '../../../services/settings.service';
import { exportService, ExportKind } from '../../../services/export.service';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../../../types/settings';
import type { DatabaseInfo } from '../types/dataManagement.types';

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (timestamp: number): string => {
  if (!timestamp) return '-';

  const date = new Date(timestamp * 1000);

  return date.toLocaleString();
};

const DataManagementPage = () => {
  const [info, setInfo] = useState<DatabaseInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [studio, setStudio] = useState<StudioSettings>(
    DEFAULT_STUDIO_SETTINGS,
  );
  const [studioLoaded, setStudioLoaded] = useState(false);
  const [savingStudio, setSavingStudio] = useState(false);

  const [exporting, setExporting] = useState<ExportKind | null>(null);

  useEffect(() => {
    loadInfo();
    loadStudioSettings();
  }, []);

  const loadStudioSettings = async () => {
    try {
      const data = await settingsService.getStudioSettings();
      setStudio(data);
    } catch (error) {
      console.error(error);
    } finally {
      setStudioLoaded(true);
    }
  };

  const handleSaveStudio = async () => {
    if (!studio.studio_name.trim()) {
      toastError('Studio name is required');
      return;
    }

    const toastId = toastLoading('Saving settings...');

    try {
      setSavingStudio(true);
      await settingsService.saveStudioSettings(studio);

      toastDismiss(toastId);
      toastSuccess('Settings saved successfully');
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError('Failed to save settings');
    } finally {
      setSavingStudio(false);
    }
  };

  const handleExportCsv = async (kind: ExportKind) => {
    const labels: Record<ExportKind, string> = {
      quotations: 'Quotations',
      clients: 'Clients',
      payments: 'Payments',
      services: 'Services',
    };

    const destinationPath = await save({
      title: `Export ${labels[kind]}`,
      defaultPath: `photoerp-${kind}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      filters: [
        {
          name: 'CSV',
          extensions: ['csv'],
        },
      ],
    });

    if (!destinationPath) return;

    const toastId = toastLoading(`Exporting ${labels[kind]}...`);

    try {
      setExporting(kind);

      await exportService.exportCsv(kind, destinationPath);

      toastDismiss(toastId);
      toastSuccess(`${labels[kind]} exported successfully`);
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError('Failed to export data');
    } finally {
      setExporting(null);
    }
  };

  const loadInfo = async () => {
    try {
      setLoadingInfo(true);
      const data = await dataManagementService.getDatabaseInfo();
      setInfo(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInfo(false);
    }
  };

  const defaultBackupName = () => {
    const today = new Date().toISOString().slice(0, 10);
    return `photoerp-backup-${today}.db`;
  };

  const handleExportBackup = async () => {
    const destinationPath = await save({
      title: 'Save Backup',
      defaultPath: defaultBackupName(),
      filters: [
        {
          name: 'Database',
          extensions: ['db'],
        },
      ],
    });

    if (!destinationPath) return;

    const toastId = toastLoading('Creating backup...');

    try {
      setBackingUp(true);
      await dataManagementService.exportBackup(destinationPath);

      toastDismiss(toastId);
      toastSuccess('Backup created successfully.');

      await loadInfo();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError('Unable to create backup.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    const selected = await open({
      title: 'Select Backup File',
      multiple: false,
      directory: false,
      filters: [
        {
          name: 'Database',
          extensions: ['db'],
        },
      ],
    });

    if (!selected || Array.isArray(selected)) return;

    const confirmed = await confirm(
      'Restoring a backup will replace the current PhotoERP data.\n\nThis action cannot be undone.\n\nDo you want to continue?',
      {
        title: 'Restore Backup',
        kind: 'warning',
        okLabel: 'Restore',
        cancelLabel: 'Cancel',
      },
    );

    if (!confirmed) return;

    const toastId = toastLoading('Restoring backup...');

    try {
      setRestoring(true);
      const message = await dataManagementService.restoreBackup(selected);

      toastDismiss(toastId);
      toastSuccess(
        `${message}. PhotoERP will reload the application data.`,
      );

      await loadInfo();
    } catch (error) {
      console.error(error);

      toastDismiss(toastId);
      toastError('Unable to restore backup.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackNavigation fallbackPath="/" label="Back to Dashboard" />

      <div>
        <h1 className="text-3xl font-bold">Settings</h1>

        <p className="mt-1 text-slate-500">
          Studio details, data export, backup and restore.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">
            Studio Details
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          These details are shown on generated quotation PDFs.
        </p>

        {!studioLoaded ? (
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
              <Button loading={savingStudio} onClick={handleSaveStudio}>
                Save Studio Details
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-green-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">
            Export Data (CSV)
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Download your data as a CSV file for Excel or Google Sheets.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {(['quotations', 'clients', 'payments', 'services'] as ExportKind[]).map(
            (kind) => (
              <Button
                key={kind}
                variant="secondary"
                leftIcon={<Download size={16} />}
                loading={exporting === kind}
                onClick={() => handleExportCsv(kind)}
              >
                {kind.charAt(0).toUpperCase() + kind.slice(1)}
              </Button>
            ),
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Database size={18} className="text-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">
            Database
          </h2>
        </div>

        {loadingInfo ? (
          <Loader size="sm" text="Loading database info..." />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Database Size</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatBytes(info?.database_size ?? 0)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Last Modified</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatDate(info?.database_modified ?? 0)}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-sm text-slate-500">Location</p>
              <p className="break-all text-sm text-slate-600">
                {info?.database_path || '-'}
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Backup</h2>
            <p className="mt-1 text-sm text-slate-500">
              Protect your data by creating a copy of your complete PhotoERP database.
            </p>
          </div>

          <Button leftIcon={<Download size={18} />} loading={backingUp} onClick={handleExportBackup}>
            Export Backup
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Restore</h2>
            <p className="mt-1 text-sm text-slate-500">
              Move your PhotoERP data from another computer or recover from a previous backup.
            </p>
          </div>

          <Button
            variant="secondary"
            leftIcon={<Upload size={18} />}
            loading={restoring}
            onClick={handleRestoreBackup}
          >
            Restore Backup
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <ShieldAlert
            size={20}
            className="mt-0.5 shrink-0 text-yellow-600"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Safety Note</h2>
            <p className="mt-1 text-sm text-slate-500">
              Restoring a backup will replace your current data. A safety backup will
              automatically be created before restoration, so your existing data can
              always be recovered.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DataManagementPage;