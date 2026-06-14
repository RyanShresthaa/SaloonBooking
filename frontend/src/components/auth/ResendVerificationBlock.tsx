import { useEffect, useState } from 'react';
import { resendVerificationEmail } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/utils/apiError';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

type Props = {
  lockedEmail?: string;
  /** Initial value for the visible email field. */
  defaultEmail?: string;
  className?: string;
};

export default function ResendVerificationBlock({ lockedEmail, defaultEmail = '', className = '' }: Props) {
  const hideField = lockedEmail !== undefined;
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!hideField && defaultEmail) {
      setEmail((prev) => (prev ? prev : defaultEmail));
    }
  }, [hideField, defaultEmail]);

  const send = async () => {
    const to = hideField ? String(lockedEmail).trim() : email.trim();
    if (!to) {
      setFeedback({ type: 'err', text: 'Enter the email you used to register.' });
      return;
    }
    setFeedback(null);
    setLoading(true);
    try {
      const res = await resendVerificationEmail({ email: to });
      const body = res.data as { message?: string };
      const msg =
        body?.message ||
        'If that account exists and is not verified yet, we sent a new verification link.';
      setFeedback({ type: 'ok', text: msg });
    } catch (e: unknown) {
      setFeedback({ type: 'err', text: getApiErrorMessage(e, 'Could not send email.') });
    } finally {
      setLoading(false);
    }
  };

  const effectiveEmail = hideField ? String(lockedEmail).trim() : email.trim();
  const canSend = Boolean(effectiveEmail);

  return (
    <div className={`space-y-4 ${className}`} aria-live="polite">
      <p className="text-sm text-stone-600">
        Open the link in the email we sent to finish verification. You can send a new message if it expired or never
        arrived.
      </p>
      {!hideField && (
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@salon.com"
        />
      )}
      <Button type="button" variant="secondary" size="md" loading={loading} disabled={!canSend} onClick={send}>
        Send verification email
      </Button>
      {feedback && (
        <p
          className={`text-sm ${feedback.type === 'ok' ? 'text-emerald-800' : 'text-red-800'}`}
          role={feedback.type === 'err' ? 'alert' : 'status'}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
