import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { resetPassword } from '@/lib/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z
  .object({
    password: z.string().min(6, 'At least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token');
  const token = rawToken ? decodeURIComponent(rawToken) : '';
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await resetPassword({ token, password: data.password });
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Could not reset password'));
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="surface-card rounded-lg p-8 text-center sm:p-10">
          <h1 className="text-2xl text-stone-900">Missing link</h1>
          <p className="mt-3 text-sm text-stone-600">This page needs a valid reset token from your email.</p>
          <Link to="/forgot-password" className="link-quiet mt-6 inline-block text-sm font-semibold">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="surface-card rounded-lg p-8 sm:p-10">
        <div className="mb-8 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Security</p>
          <h1 className="text-3xl text-stone-900">New password</h1>
          <p className="text-sm text-stone-600">Choose something you have not used elsewhere.</p>
        </div>

        {serverError && (
          <div className="mb-6 border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="New password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            autoComplete="new-password"
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full max-w-md justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
