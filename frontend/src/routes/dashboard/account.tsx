import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getMe, patchMe, exportMySalonData } from '@/lib/api/auth';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { applyTheme, readStoredTheme, type ThemeChoice } from '@/lib/theme';

interface ProfileForm {
  name: string;
  clientNotes: string;
  allergies: string;
  marketingEmailOptIn: boolean;
}

export default function AccountPage() {
  const { updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() => readStoredTheme() ?? 'light');

  const apply = (mode: ThemeChoice) => {
    applyTheme(mode);
    setThemeChoice(mode);
  };

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ProfileForm>({
    defaultValues: { marketingEmailOptIn: true, name: '', clientNotes: '', allergies: '' },
  });

  useEffect(() => {
    getMe()
      .then((res) => {
        const u = res.data.data;
        reset({
          name: u.name || '',
          clientNotes: u.clientNotes || '',
          allergies: u.allergies || '',
          marketingEmailOptIn: u.marketingEmailOptIn !== false,
        });
      })
      .catch((err: unknown) => setServerError(getApiErrorMessage(err, 'Could not load profile.')))
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: ProfileForm) => {
    setServerError('');
    setSavedMsg('');
    try {
      const res = await patchMe({
        name: data.name,
        clientNotes: data.clientNotes,
        allergies: data.allergies,
        marketingEmailOptIn: data.marketingEmailOptIn,
      });
      const u = res.data.data;
      updateUser({
        name: u.name,
        clientNotes: u.clientNotes,
        allergies: u.allergies,
        marketingEmailOptIn: u.marketingEmailOptIn,
        loyaltyPoints: u.loyaltyPoints,
      });
      setSavedMsg('Saved.');
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err, 'Could not save.'));
    }
  };

  const downloadExport = async () => {
    setServerError('');
    try {
      const res = await exportMySalonData();
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salon-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err, 'Export failed.'));
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-20" role="status" aria-label="Loading profile">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="border-b border-stone-300/50 pb-8 dark:border-stone-600/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
            Privacy &amp; CRM
          </p>
          <h1 className="font-display text-3xl text-stone-900 dark:text-stone-50 sm:text-4xl">Account</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Salon notes and allergies help stylists prepare. Marketing opt-in is separate from appointment reminder
            settings at booking time.
          </p>
        </header>

        {serverError ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900">{serverError}</div>
        ) : null}
        {savedMsg ? (
          <div className="rounded-md border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">{savedMsg}</div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="surface-card space-y-6 rounded-lg p-6 sm:p-8">
          <Input label="Display name" {...register('name')} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientNotes" className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Client notes (for the salon)
            </label>
            <textarea
              id="clientNotes"
              rows={4}
              placeholder="Preferences, past formulas, how you like your cut…"
              className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring"
              {...register('clientNotes')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="allergies" className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
              Allergies &amp; sensitivities
            </label>
            <textarea
              id="allergies"
              rows={3}
              placeholder="Products or ingredients to avoid"
              className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring"
              {...register('allergies')}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-stone-200 bg-stone-50/60 px-4 py-3">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900" {...register('marketingEmailOptIn', { setValueAs: (v) => v === true || v === 'on' })} />
            <span className="text-sm text-stone-800">
              I agree to receive occasional marketing emails from the salon (offers, events). I can turn this off anytime.
            </span>
          </label>
          <Button type="submit" loading={isSubmitting}>
            Save profile
          </Button>
        </form>

        <section className="surface-muted rounded-lg border-stone-300/80 p-5 sm:p-6 dark:border-stone-700/80">
          <h2 className="font-display text-lg text-stone-900 dark:text-stone-50">Appearance</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">Light or dark interface on this device.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant={themeChoice === 'light' ? 'primary' : 'secondary'} size="sm" onClick={() => apply('light')}>
              Light
            </Button>
            <Button type="button" variant={themeChoice === 'dark' ? 'primary' : 'secondary'} size="sm" onClick={() => apply('dark')}>
              Dark
            </Button>
          </div>
        </section>

        <section className="surface-muted rounded-lg border-stone-300/80 p-5 sm:p-6 dark:border-stone-700/80">
          <h2 className="font-display text-lg text-stone-900 dark:text-stone-50">Your data</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Download a JSON copy of your profile and booking history. For full account deletion, contact the salon.
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => void downloadExport()}>
            Download my data
          </Button>
        </section>
      </div>
    </AuthGuard>
  );
}
