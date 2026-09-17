import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

import { navigationItems } from '../../constants/navigation';
import { useStudioSettings } from '../../hooks/useStudioSettings';
import { DEFAULT_STUDIO_SETTINGS } from '../../types/settings';

const isActivePath = (itemPath: string, currentPath: string): boolean => {
  // Exact match is always active.
  if (currentPath === itemPath) return true;

  // Root item must never be a prefix match for other routes.
  const isRoot = itemPath === '/';

  // Only match deeper routes when this item owns the sub-routes, and skip when
  // the current path is itself claimed by another top-level item (e.g. /quotations
  // must NOT highlight when /quotations/new is active).
  if (!isRoot && currentPath.startsWith(itemPath + '/')) {
    const claimedByOther = navigationItems.some(
      (item) =>
        item.path !== itemPath && currentPath === item.path,
    );

    return !claimedByOther;
  }

  return false;
};

const Sidebar = () => {
  const { pathname } = useLocation();

  const settings = useStudioSettings();

  const studioName =
    settings?.studio_name || DEFAULT_STUDIO_SETTINGS.studio_name;

  return (
    <aside className="w-64 border-r bg-white">
      <div className="border-b p-6">
        <h1 className="text-xl font-bold">
          📸 {studioName}
        </h1>
      </div>

      <nav className="space-y-2 p-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          const active = isActivePath(item.path, pathname);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-4 py-3 transition-all',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon size={20} />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;