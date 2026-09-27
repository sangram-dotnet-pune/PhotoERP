import { useEffect, useState } from 'react';
import { PackagePlus } from 'lucide-react';

import Loader from '../../../components/ui/Loader';
import { toastError } from '../../../utils/toast';
import { packageService } from '../../../services/package.service';
import type { ReusablePackage } from '../../../types/package';

interface PackageSelectProps {
  onSelect: (pkg: ReusablePackage) => void;
  disabled?: boolean;
}

const PackageSelect = ({ onSelect, disabled }: PackageSelectProps) => {
  const [packages, setPackages] = useState<ReusablePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setPackages(await packageService.getPackages());
    } catch (error) {
      console.error('Failed to load packages', error);
      toastError('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader size="sm" text="Loading packages..." />;
  }

  if (packages.length === 0) {
    return null;
  }

  const handleSelect = (val: string) => {
    const match = packages.find((pkg) => String(pkg.id) === val);
    if (!match) return;

    onSelect(match);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-slate-500">
        <PackagePlus size={16} aria-hidden="true" />
        <span className="text-sm">Add Package:</span>
      </div>

      <select
        aria-label="Choose a package to add"
        defaultValue=""
        disabled={disabled}
        onChange={(e) => handleSelect(e.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="" disabled>
          Select a package
        </option>

        {packages.map((pkg) => (
          <option key={pkg.id} value={String(pkg.id)}>
            {pkg.name} ({pkg.services.length} services)
          </option>
        ))}
      </select>
    </div>
  );
};

export default PackageSelect;