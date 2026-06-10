import { Suspense, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '@/lib/axios';
import { CheckCircle, Mail, XCircle } from 'lucide-react';
import ResendVerificationBlock from '@/components/auth/ResendVerificationBlock';

function VerifyEmailContent() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const hasToken = Boolean(token);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(() =>
    hasToken ? 'loading' : 'idle'
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setStatus('success');
        setMessage((res.data as { message?: string })?.message || '');
      })
      .catch((error: unknown) => {
        setStatus('error');
        const responseMessage = axios.isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;
        setMessage(responseMessage || 'Verification failed.');
      });
  }, [token]);

  return (
    <div className="w-full max-w-md">
      <div className="surface-card rounded-lg px-8 py-12 text-center">
        {status === 'loading' && (
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 h-11 w-11 text-emerald-700" strokeWidth={1.25} />
            <h2 className="text-2xl text-stone-900">You&apos;re verified</h2>
            <p className="mt-3 text-sm text-stone-600">{message}</p>
            <Link
              to="/login"
              className="mt-8 inline-flex w-full items-center justify-center rounded-md border border-stone-900 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-50 no-underline transition hover:bg-stone-800 focus-ring"
            >
              Continue to sign in
            </Link>
          </>
        )}
        {status === 'idle' && !hasToken && (
          <>
            <Mail className="mx-auto mb-4 h-11 w-11 text-stone-700" strokeWidth={1.25} />
            <h2 className="text-2xl text-stone-900">Verify your email</h2>
            <p className="mt-3 text-sm text-stone-600">
              Use the link we emailed you, or enter your address below to receive a new verification message.
            </p>
            <div className="mt-8 text-left">
              <ResendVerificationBlock />
            </div>
            <Link to="/login" className="link-quiet mt-8 inline-block text-sm font-semibold">
              Back to sign in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 h-11 w-11 text-red-800/90" strokeWidth={1.25} />
            <h2 className="text-2xl text-stone-900">Link didn&apos;t work</h2>
            <p className="mt-3 text-sm text-stone-600">{message}</p>
            <div className="mt-8 rounded-md border border-stone-200 bg-stone-50/80 px-4 py-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Try again</p>
              <ResendVerificationBlock className="mt-3" />
            </div>
            <Link to="/register" className="link-quiet mt-6 inline-block text-sm font-semibold">
              Try registering again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full max-w-md justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
