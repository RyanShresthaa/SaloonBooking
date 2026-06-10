import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { registerUser } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ResendVerificationBlock from '@/components/auth/ResendVerificationBlock';
import { CheckCircle } from 'lucide-react';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await registerUser(data);
      setRegisteredEmail(data.email.trim());
      setSuccess(true);
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Registration failed'));
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="surface-card rounded-lg px-8 py-12">
          <CheckCircle className="mx-auto mb-4 h-11 w-11 text-emerald-700" strokeWidth={1.25} />
          <h2 className="text-2xl text-stone-900">Check your inbox</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            We sent a verification link. Open it on this device when you are ready to activate the account.
          </p>
          <div className="mt-8 rounded-md border border-stone-200 bg-stone-50/80 px-4 py-4 text-left">
            <ResendVerificationBlock lockedEmail={registeredEmail} />
          </div>
          <Link to="/login" className="link-quiet mt-8 inline-block text-sm font-semibold">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="surface-card rounded-lg p-8 sm:p-10">
        <div className="mb-8 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">New staff</p>
          <h1 className="text-3xl text-stone-900">Register</h1>
          <p className="text-sm text-stone-600">
            Already set up?{' '}
            <Link to="/login" className="link-quiet font-medium text-stone-800">
              Sign in
            </Link>
          </p>
        </div>

        {serverError && (
          <div className="mb-6 border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Full name" placeholder="Alex Morgan" error={errors.name?.message} {...register('name')} />
          <Input
            label="Email"
            type="email"
            placeholder="you@salon.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
