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
      navigate('/dashboard');
    } catch (error: unknown) {
      if (isUnverifiedEmailLoginError(error)) {
        setShowVerificationHelp(true);
      }
      setServerError(getApiErrorMessage(error, 'Login failed'));
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="surface-card rounded-lg p-8 sm:p-10">
        <div className="mb-8 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Welcome</p>
          <h1 className="text-3xl text-stone-900">Sign in</h1>
          <p className="text-sm text-stone-600">
            No account?{' '}
            <Link to="/register" className="link-quiet font-medium text-stone-800">
              Register
            </Link>
          </p>
        </div>

        {resetOk && (
          <div className="mb-6 border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
            Password updated. Sign in with your new password.
          </div>
        )}

        {serverError && (
          <div className="mb-6 border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900">{serverError}</div>
        )}

        {showVerificationHelp && (
          <div className="mb-6 border border-amber-200/90 bg-amber-50/90 px-4 py-4 text-stone-900">
            <p className="text-sm font-semibold text-stone-900">Finish verifying your email</p>
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
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            autoComplete="current-password"
            {...register('password')}
          />
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-semibold uppercase tracking-wider text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-stone-900">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
