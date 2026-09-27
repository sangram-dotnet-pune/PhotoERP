import { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
} from 'lucide-react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Loader from '../../../components/ui/Loader';
import Modal from '../../../components/ui/Modal';
import {
  toastSuccess,
  toastError,
  toastLoading,
  toastDismiss,
} from '../../../utils/toast';
import { packageService } from '../../../services/package.service';
import type {
  CatalogService,
  PackageService,
  ReusablePackage,
} from '../../../types/package';

const emptyService = (): PackageService => ({
  service_name: '',
  quantity: 1,
  price: 0,
});

const emptyPackage = (): ReusablePackage => ({
  name: '',
  services: [emptyService()],
});

const ServicesPackagesSection = () => {
  const [packages, setPackages] = useState<ReusablePackage[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ReusablePackage | null>(
    null,
  );
  const [packageForm, setPackageForm] =
    useState<ReusablePackage>(emptyPackage());
  const [packageError, setPackageError] = useState('');
  const [savingPackage, setSavingPackage] = useState(false);

  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogForm, setCatalogForm] = useState<CatalogService>({
    name: '',
    price: 0,
  });
  const [catalogError, setCatalogError] = useState('');
  const [savingCatalog, setSavingCatalog] = useState(false);

  const load = async () => {
    try {
      const [pkgs, services] = await Promise.all([
        packageService.getPackages(),
        packageService.getCatalogServices(),
      ]);

      setPackages(pkgs);
      setCatalog(services);
    } catch (error) {
      console.error('Failed to load services & packages', error);
      toastError('Failed to load services & packages');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openPackageModal = (pkg?: ReusablePackage) => {
    setEditingPackage(pkg ?? null);
    setPackageForm(
      pkg ? JSON.parse(JSON.stringify(pkg)) : emptyPackage(),
    );
    setPackageError('');
    setPackageModalOpen(true);
  };

  const openCatalogModal = (service?: CatalogService) => {
    setCatalogForm(
      service ? { id: service.id, name: service.name, price: service.price } : { name: '', price: 0 },
    );
    setCatalogError('');
    setCatalogModalOpen(true);
  };

  const validatePackageForm = (): boolean => {
    if (!packageForm.name.trim()) {
      setPackageError('Package name is required');
      return false;
    }

    const invalid = packageForm.services.some(
      (s) =>
        !s.service_name.trim() ||
        s.quantity < 1 ||
        !Number.isFinite(s.price) ||
        s.price < 0,
    );

    if (invalid) {
      setPackageError(
        'Every service needs a name, a quantity of at least 1 and a non-negative price',
      );
      return false;
    }

    return true;
  };

  const handleSavePackage = async () => {
    if (!validatePackageForm()) return;

    const toastId = toastLoading('Saving package...');

    try {
      setSavingPackage(true);
      await packageService.savePackage(packageForm);
      toastDismiss(toastId);
      toastSuccess(editingPackage ? 'Package updated' : 'Package added successfully');
      setPackageModalOpen(false);
      await load();
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);

      const message =
        typeof error === 'string' ? error : 'Failed to save package';
      setPackageError(message);
    } finally {
      setSavingPackage(false);
    }
  };

  const handleDeletePackage = async (pkg: ReusablePackage) => {
    if (!pkg.id) return;

    const toastId = toastLoading('Deleting package...');

    try {
      await packageService.deletePackage(pkg.id);
      toastDismiss(toastId);
      toastSuccess('Package deleted');
      await load();
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);
      toastError('Failed to delete package');
    }
  };

  const handleSaveCatalog = async () => {
    if (!catalogForm.name.trim()) {
      setCatalogError('Service name is required');
      return;
    }

    if (!Number.isFinite(catalogForm.price) || catalogForm.price < 0) {
      setCatalogError('Price must be a non-negative number');
      return;
    }

    const toastId = toastLoading('Saving service...');

    try {
      setSavingCatalog(true);
      await packageService.saveCatalogService(catalogForm);
      toastDismiss(toastId);
      toastSuccess(
        catalogForm.id ? 'Service updated' : 'Service added successfully',
      );
      setCatalogModalOpen(false);
      await load();
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);

      const message =
        typeof error === 'string' ? error : 'Failed to save service';
      setCatalogError(message);
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleDeleteCatalog = async (service: CatalogService) => {
    if (!service.id) return;

    const toastId = toastLoading('Deleting service...');

    try {
      await packageService.deleteCatalogService(service.id);
      toastDismiss(toastId);
      toastSuccess('Service deleted');
      await load();
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);
      toastError('Failed to delete service');
    }
  };

  if (!loaded) {
    return (
      <Card>
        <Loader size="sm" text="Loading services & packages..." />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Package size={18} className="text-indigo-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-900">
          Services &amp; Packages
        </h2>
      </div>

      <p className="mt-1 text-sm text-slate-500">
        Create reusable packages and a service catalog to quickly build
        quotations.
      </p>

      <div className="mt-5 space-y-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles size={16} className="text-indigo-600" aria-hidden="true" />
              Packages
            </h3>

            <Button
              leftIcon={<Plus size={16} />}
              onClick={() => openPackageModal()}
            >
              New Package
            </Button>
          </div>

          {packages.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No packages yet. Create one to add multiple services to a
              quotation in a single click.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {pkg.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {pkg.services.length} service
                        {pkg.services.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openPackageModal(pkg)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                        aria-label={`Edit ${pkg.name}`}
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePackage(pkg)}
                        className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                        aria-label={`Delete ${pkg.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {pkg.services.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                      {pkg.services.slice(0, 4).map((s, index) => (
                        <li
                          key={index}
                          className="flex justify-between gap-2 text-xs text-slate-600"
                        >
                          <span className="min-w-0 truncate">
                            {s.service_name}
                          </span>
                          <span className="shrink-0 text-slate-400">
                            x{s.quantity} · ₹
                            {(s.quantity * s.price).toLocaleString('en-IN')}
                          </span>
                        </li>
                      ))}

                      {pkg.services.length > 4 && (
                        <li className="text-xs text-slate-400">
                          +{pkg.services.length - 4} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Service Catalog
            </h3>

            <Button
              variant="secondary"
              leftIcon={<Plus size={16} />}
              onClick={() => openCatalogModal()}
            >
              Add Service
            </Button>
          </div>

          {catalog.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No catalog services yet. Add your frequently used services with a
              standard price.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Service
                    </th>
                    <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Price
                    </th>
                    <th className="w-20 p-3 text-center">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {catalog.map((service) => (
                    <tr key={service.id} className="border-t">
                      <td className="p-3 text-sm text-slate-800">
                        {service.name}
                      </td>
                      <td className="p-3 text-right text-sm font-semibold text-slate-900">
                        ₹ {service.price.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openCatalogModal(service)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                            aria-label={`Edit ${service.name}`}
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCatalog(service)}
                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                            aria-label={`Delete ${service.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {packageModalOpen && (
        <Modal
          open
          title={editingPackage ? 'Edit Package' : 'New Package'}
          confirmText={editingPackage ? 'Update Package' : 'Add Package'}
          cancelText="Cancel"
          loading={savingPackage}
          onClose={() => setPackageModalOpen(false)}
          onConfirm={handleSavePackage}
        >
          <div className="space-y-4">
            {packageError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
              >
                {packageError}
              </p>
            )}

            <Input
              label="Package Name"
              value={packageForm.name}
              onChange={(e) => {
                setPackageForm((prev) => ({ ...prev, name: e.target.value }));
                setPackageError('');
              }}
              placeholder="e.g. Premium Wedding Package"
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Services
                </p>

                <Button
                  variant="outline"
                  leftIcon={<Plus size={14} />}
                  onClick={() =>
                    setPackageForm((prev) => ({
                      ...prev,
                      services: [...prev.services, emptyService()],
                    }))
                  }
                >
                  Add Service
                </Button>
              </div>

              <div className="space-y-3">
                {packageForm.services.map((service, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_70px_90px_32px] gap-2"
                  >
                    <Input
                      aria-label="Service name"
                      placeholder="Service name"
                      value={service.service_name}
                      onChange={(e) => {
                        const next = [...packageForm.services];
                        next[index] = {
                          ...next[index],
                          service_name: e.target.value,
                        };
                        setPackageForm((prev) => ({ ...prev, services: next }));
                        setPackageError('');
                      }}
                    />

                    <Input
                      aria-label="Quantity"
                      type="number"
                      min={1}
                      value={service.quantity}
                      onChange={(e) => {
                        const next = [...packageForm.services];
                        const val = Number(e.target.value);
                        next[index] = {
                          ...next[index],
                          quantity: val < 1 ? 1 : val,
                        };
                        setPackageForm((prev) => ({ ...prev, services: next }));
                        setPackageError('');
                      }}
                    />

                    <Input
                      aria-label="Price"
                      type="number"
                      min={0}
                      value={service.price}
                      onChange={(e) => {
                        const next = [...packageForm.services];
                        const val = Number(e.target.value);
                        next[index] = {
                          ...next[index],
                          price: val < 0 ? 0 : val,
                        };
                        setPackageForm((prev) => ({ ...prev, services: next }));
                        setPackageError('');
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setPackageForm((prev) => ({
                          ...prev,
                          services: prev.services.filter(
                            (_, i) => i !== index,
                          ),
                        }))
                      }
                      className="mt-1 self-center rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                      aria-label="Remove service row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {catalogModalOpen && (
        <Modal
          open
          title={catalogForm.id ? 'Edit Service' : 'Add Service'}
          confirmText={catalogForm.id ? 'Update Service' : 'Add Service'}
          cancelText="Cancel"
          loading={savingCatalog}
          onClose={() => setCatalogModalOpen(false)}
          onConfirm={handleSaveCatalog}
        >
          <div className="space-y-4">
            {catalogError && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
              >
                {catalogError}
              </p>
            )}

            <Input
              label="Service Name"
              value={catalogForm.name}
              onChange={(e) => {
                setCatalogForm((prev) => ({ ...prev, name: e.target.value }));
                setCatalogError('');
              }}
              placeholder="e.g. Cinematic Videography"
            />

            <Input
              label="Price (₹)"
              type="number"
              min={0}
              value={catalogForm.price}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCatalogForm((prev) => ({
                  ...prev,
                  price: val < 0 ? 0 : val,
                }));
                setCatalogError('');
              }}
            />
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default ServicesPackagesSection;