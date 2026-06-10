import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import { requestPasswordReset } from '@/lib/api/auth';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await requestPasswordReset(data);
      setDone(true);
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Something went wrong'));
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="surface-card rounded-lg p-8 sm:p-10">
        <div className="mb-8 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Account</p>
          <h1 className="text-3xl text-stone-900">Forgot password</h1>
          <p className="text-sm text-stone-600">
            Remember it?{' '}
            <Link to="/login" className="link-quiet font-medium text-stone-800">
              Sign in
            </Link>
          </p>
        </div>

        {done ? (
          <div className="space-y-4 text-sm leading-relaxed text-stone-700">
            <p>
              If an account exists for that address, we sent a reset link. It expires in about an hour. Check spam
              folders too.
            </p>
            <Link to="/login" className="link-quiet font-semibold text-stone-900">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {serverError && (
              <div className="mb-6 border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900">{serverError}</div>
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
              <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
                Send reset link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
