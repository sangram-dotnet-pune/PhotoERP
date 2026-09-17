import { useStudioSettings } from '../../hooks/useStudioSettings';
import { DEFAULT_STUDIO_SETTINGS } from '../../types/settings';

const Header = () => {
  const settings = useStudioSettings();

  const studioName =
    settings?.studio_name || DEFAULT_STUDIO_SETTINGS.studio_name;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h2 className="text-2xl font-semibold">
        {studioName}
      </h2>

      <span className="text-sm text-slate-500">
        {today}
      </span>
    </header>
  );
};

export default Header;