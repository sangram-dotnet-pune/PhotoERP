import { useState } from 'react';
import {
  Building2,
  Palette,
  LayoutTemplate,
  Package,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { validatePin, validateRequired } from '../../utils/validation';
import { toastSuccess, toastLoading, toastDismiss } from '../../utils/toast';
import { settingsService } from '../../services/settings.service';
import { appLockService } from '../../services/appLock.service';
import { setupService } from '../../services/setup.service';
import {
  DEFAULT_STUDIO_SETTINGS,
  StudioSettings,
} from '../../types/settings';

import BrandingSection from '../settings/components/BrandingSection';
import QuotationTemplateSection from '../settings/components/QuotationTemplateSection';
import ServicesPackagesSection from '../settings/components/ServicesPackagesSection';

interface SetupWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { label: 'Business', icon: Building2 },
  { label: 'Branding', icon: Palette },
  { label: 'Template', icon: LayoutTemplate },
  { label: 'Packages', icon: Package },
  { label: 'Security', icon: ShieldCheck },
];

const SetupWizard = ({ onComplete }: SetupWizardProps) => {
  const [step, setStep] = useState(0);
  const [studio, setStudio] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [studioError, setStudioError] = useState('');
  const [busy, setBusy] = useState(false);

  const [enablePin, setEnablePin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const canSkipStep = step === 3 || step === 4;

  const saveStep = (): Promise<boolean> => {
    if (step === 0) return saveBusinessStep();
    if (step === 4) return finishStep();
    return Promise.resolve(true);
  };

  const saveBusinessStep = async (): Promise<boolean> => {
    const nameError = validateRequired(studio.studio_name, 'Studio name');
    if (nameError) {
      setStudioError(nameError);
      return false;
    }

    try {
      setBusy(true);
      await settingsService.saveStudioSettings(studio);
      setStudioError('');
      return true;
    } catch (error) {
      console.error(error);
      setStudioError('Failed to save business information');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const finishStep = async (): Promise<boolean> => {
    if (enablePin) {
      const pinErr = pin ? validatePin(pin) : 'Enter a PIN to enable lock.';
      if (pinErr) {
        setPinError(pinErr);
        return false;
      }

      if (!confirmPin) {
        setPinError('Enter the PIN again.');
        return false;
      }

      if (pin !== confirmPin) {
        setPinError('PINs do not match.');
        return false;
      }
    }

    const toastId = toastLoading('Completing setup...');

    try {
      setBusy(true);

      if (enablePin) {
        await appLockService.enable(pin);
      }

      await setupService.completeSetup();

      toastDismiss(toastId);
      toastSuccess('Setup complete. Welcome to PhotoERP!');
      onComplete();
      return true;
    } catch (error) {
      console.error(error);
      toastDismiss(toastId);
      setPinError('Failed to finish setup. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleNext = async () => {
    const saved = await saveStep();
    if (!saved) return;

    if (step === STEPS.length - 1) return;

    setStep((prev) => prev + 1);
  };

  const handleSkip = () => {
    if (step === STEPS.length - 1) {
      finishStep();
      return;
    }
    setStep((prev) => prev + 1);
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
            <Sparkles size={26} aria-hidden="true" />
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Welcome to PhotoERP
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-slate-500">
            Let's set up your studio in a few quick steps so your quotations
            look perfect from day one.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <ol className="flex flex-wrap items-center justify-center gap-2">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === step;
              const isDone = index < step;

              return (
                <li key={item.label} className="flex items-center gap-2">
                  {index > 0 && (
                    <div
                      className={clsx(
                        'h-px w-6',
                        isActive || isDone ? 'bg-blue-600' : 'bg-slate-300',
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <div
                    className={clsx(
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : isDone
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-400',
                    )}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {item.label}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <Card className="mt-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <StepIcon size={18} className="text-blue-600" aria-hidden="true" />
                Step {step + 1} of {STEPS.length}: {STEPS[step].label}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {step === 0 &&
                  'Tell us about your photography business. This appears on quotation PDFs.'}
                {step === 1 &&
                  'Pick the brand colors used across the quotation template. Save with the button inside the card.'}
                {step === 2 &&
                  'Customize your quotation template. The preview updates live. Save your changes.'}
                {step === 3 &&
                  'Optional: create reusable packages so you can add multiple services in one click.'}
                {step === 4 &&
                  'Optional: protect PhotoERP with a PIN lock.'}
              </p>
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              {studioError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                >
                  {studioError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Studio Name"
                  value={studio.studio_name}
                  onChange={(e) => {
                    setStudio((prev) => ({ ...prev, studio_name: e.target.value }));
                    setStudioError('');
                  }}
                  required
                  placeholder="e.g. Memories Forever Photography"
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
                  type="tel"
                  value={studio.studio_phone}
                  onChange={(e) =>
                    setStudio((prev) => ({ ...prev, studio_phone: e.target.value }))
                  }
                />

                <Input
                  label="Email"
                  type="email"
                  value={studio.studio_email}
                  onChange={(e) =>
                    setStudio((prev) => ({ ...prev, studio_email: e.target.value }))
                  }
                />

                <Input
                  label="Website"
                  value={studio.studio_website}
                  onChange={(e) =>
                    setStudio((prev) => ({ ...prev, studio_website: e.target.value }))
                  }
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
              </div>
            </div>
          )}

          {step === 1 && <BrandingSection />}

          {step === 2 && <QuotationTemplateSection />}

          {step === 3 && <ServicesPackagesSection />}

          {step === 4 && (
            <div className="space-y-4">
              {pinError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600"
                >
                  {pinError}
                </p>
              )}

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <span className="text-sm font-medium text-slate-900">
                  Enable Application Lock
                </span>

                <input
                  type="checkbox"
                  checked={enablePin}
                  onChange={(e) => {
                    setEnablePin(e.target.checked);
                    setPinError('');
                  }}
                  className="h-5 w-5 accent-blue-600"
                />
              </label>

              {enablePin && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="PIN (4 to 6 digits)"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    placeholder="Enter a 4 to 6 digit PIN"
                  />

                  <Input
                    label="Confirm PIN"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    placeholder="Re-enter the PIN"
                  />
                </div>
              )}

              <p className="text-xs text-slate-400">
                The PIN is stored as a secure hash and never saved in plain
                text.
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
            <Button
              variant="outline"
              disabled={step === 0 || busy}
              onClick={() => setStep((prev) => prev - 1)}
            >
              Back
            </Button>

            <div className="flex gap-3">
              {canSkipStep && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={handleSkip}
                >
                  Skip
                </Button>
              )}

              <Button loading={busy} onClick={handleNext}>
                {step === STEPS.length - 1
                  ? 'Finish Setup'
                  : 'Continue'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SetupWizard;