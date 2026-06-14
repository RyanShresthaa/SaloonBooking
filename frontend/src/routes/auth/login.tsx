import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getApiErrorMessage, isUnverifiedEmailLoginError } from '@/lib/utils/apiError';
import { loginUser } from '@/lib/api/auth';
import { useAuthStore } from '@/store/authStore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ResendVerificationBlock from '@/components/auth/ResendVerificationBlock';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

/** Delicate botanical line — warm terracotta ink on linen */
function DeskLeafMotif({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 88 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M4 28c12-18 32-22 44-14 8 5 12 14 10 22M12 26c10-8 22-10 34-6M52 12c6 4 10 12 8 20M20 20c8-6 18-8 28-4"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M70 8c-4 6-4 14-2 20M74 10c2 4 2 10 0 16M66 14c6 2 10 8 12 14"
        stroke="currentColor"
        strokeWidth="0.65"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [serverError, setServerError] = useState('');
  const [showVerificationHelp, setShowVerificationHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const resetOk = Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset);
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const emailWatch = watch('email');

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setShowVerificationHelp(false);
    try {
      const res = await loginUser(data);
      const { token, user } = res.data.data;
      setAuth(user, token);
      if (user.role === 'super_admin') {
        navigate('/platform');
      } else if (
        (user.role === 'admin' || user.role === 'staff') &&
        user.salonSlug &&
        typeof user.salonSlug === 'string'
      ) {
        navigate(`/marketplace/${encodeURIComponent(user.salonSlug)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      if (isUnverifiedEmailLoginError(error)) {
        setShowVerificationHelp(true);
      }
      setServerError(getApiErrorMessage(error, 'Login failed'));
    }
  };

  return (
    <div className="relative w-full max-w-[440px] font-sans text-[#1c1917]">
      <div
        className="surface-card relative overflow-hidden rounded-[10px] border border-[#e0d9d0] bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.07),0_1px_0_rgba(255,255,255,0.85)_inset] sm:p-10 dark:border-stone-600 dark:bg-stone-900"
        data-motion-card
      >
        <div className="pointer-events-none absolute -right-2 top-5 h-16 w-24 text-[#b07d62] dark:text-[#c49a82]" aria-hidden>
          <DeskLeafMotif className="h-full w-full" />
        </div>

        <div className="relative mb-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 shrink-0 bg-[#b07d62]/35" aria-hidden />
            <span className="h-px flex-1 max-w-[10rem] bg-gradient-to-r from-[#e0d9d0] to-transparent" aria-hidden />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c]">Welcome</p>
          <h1 className="font-display mt-2 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[#1c1917] sm:text-[2.1rem] dark:text-stone-50">
            Sign in
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#78716c]">
            No account?{' '}
            <Link
              to="/register"
              className="font-medium text-[#1c1917] underline decoration-[#b07d62]/50 decoration-1 underline-offset-[3px] transition-colors hover:decoration-[#b07d62] dark:text-stone-200"
            >
              Register
            </Link>
          </p>
        </div>

        {resetOk && (
          <div className="mb-6 rounded-[6px] border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
            Password updated. Sign in with your new password.
          </div>
        )}

        {serverError && (
          <div className="mb-6 rounded-[6px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900">{serverError}</div>
        )}

        {showVerificationHelp && (
          <div className="mb-6 rounded-[6px] border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-[#1c1917]">
            <p className="text-sm font-semibold">Finish verifying your email</p>
            <ResendVerificationBlock lockedEmail={emailWatch ?? ''} className="mt-3" />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@salon.com"
            error={errors.email?.message}
            autoComplete="email"
            variant="desk"
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            autoComplete="current-password"
            variant="desk"
            passwordToggle
            {...register('password')}
          />
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[#78716c] underline decoration-[#d6d0c8] underline-offset-[3px] transition-colors hover:text-[#1c1917] hover:decoration-[#b07d62]/70"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            loading={isSubmitting}
            className="!mt-2 w-full !cursor-pointer !rounded-[6px] !border-[#2d2926] !bg-[#2d2926] !py-3 text-[0.9375rem] !font-semibold !tracking-wide !text-white !shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[background-color,border-color,transform] duration-200 hover:!border-[#231f1c] hover:!bg-[#231f1c] motion-safe:active:!scale-[0.99] dark:!border-stone-100 dark:!bg-stone-100 dark:!text-[#1c1917] dark:hover:!bg-white"
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
