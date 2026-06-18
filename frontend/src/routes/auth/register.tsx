import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { registerUser } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { CheckCircle } from 'lucide-react';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

type RegisterPayload = {
  id: string;
  name: string;
  email: string;
  verificationEmailSent?: boolean;
  verificationEmailQueued?: boolean;
  emailVerificationSkipped?: boolean;
};

export default function RegisterPage() {
  const [success, setSuccess] = useState(false);
  /** sent | queued | none = verification mail paths; immediate = verification disabled, can sign in */
  const [emailDispatch, setEmailDispatch] = useState<'sent' | 'queued' | 'none' | 'immediate'>('sent');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const res = await registerUser(data);
      const payload = res.data?.data as RegisterPayload | undefined;
      if (payload?.emailVerificationSkipped) {
        setEmailDispatch('immediate');
      } else if (payload?.verificationEmailSent === true) setEmailDispatch('sent');
      else if (payload?.verificationEmailQueued) setEmailDispatch('queued');
      else setEmailDispatch('none');
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
          <h2 className="text-2xl text-stone-900">
            {emailDispatch === 'immediate'
              ? "You're all set"
              : emailDispatch === 'none'
                ? 'Almost there'
                : 'Check your inbox'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            {emailDispatch === 'immediate' && (
              <>
                Your customer account is active — no email verification step on this server. Sign in with the email
                and password you just used.
              </>
            )}
            {emailDispatch === 'sent' && (
              <>
                We sent a verification link. Open it on this device when you are ready to activate the account.
              </>
            )}
            {emailDispatch === 'queued' && (
              <>
                Your account is ready and a verification email is being sent in the background (usually within a
                minute). Check spam as well. If nothing arrives, use &quot;Resend verification&quot; below after a
                short wait — and confirm the API host has correct Gmail App Password or SMTP settings in its
                environment.
              </>
            )}
          </p>
          <Link to="/login" className="link-quiet mt-8 inline-block text-sm font-semibold">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="surface-card rounded-lg p-8 transition-shadow hover:shadow-sm sm:p-10">
        <div className="mb-8 space-y-2">
          <p className="page-eyebrow">New account</p>
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
            autoComplete="new-password"
            passwordToggle
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
