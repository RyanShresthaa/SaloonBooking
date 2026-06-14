import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import { Search, Star } from 'lucide-react';
import { listAppointments } from '@/lib/api/appointments';
import { listVisitFeedback, createVisitFeedback, updateVisitFeedback, deleteVisitFeedback } from '@/lib/api/visitFeedback';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';

// ─── Types ───

type Appt = {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  service?: { name?: string };
};

type FeedbackRow = {
  id: string;
  appointmentId: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
  appointment?: Appt;
  user?: { name?: string; email?: string };
};

// ─── Helpers ───

function formatTimeForParse(t: string | undefined): string {
  if (t == null || t === '') return '00:00:00';
  if (typeof t === 'string') {
    if (t.length >= 8) return t.slice(0, 8);
    if (t.length === 5) return `${t}:00`;
    return `${t}`.slice(0, 8);
  }
  return dayjs(t).format('HH:mm:ss');
}

/** Mirrors server rules for when a guest may leave a review. */
function appointmentEligibleForReview(a: Appt): boolean {
  if (a.status === 'cancelled') return false;
  if (a.status === 'completed') return true;
  if (a.status !== 'pending' && a.status !== 'confirmed') return false;
  const today = dayjs().format('YYYY-MM-DD');
  const apptDay = dayjs(a.appointmentDate).format('YYYY-MM-DD');
  if (apptDay < today) return true;
  const endStr = formatTimeForParse(a.endTime);
  const visitEnd = dayjs(`${apptDay} ${endStr}`);
  return !dayjs().isBefore(visitEnd);
}

// ─── Components ───

function StarRatingPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Set rating to ${n} of 5`}
          aria-pressed={value >= n}
          disabled={disabled}
          className={`rounded-md p-1 transition hover:scale-105 focus-ring disabled:opacity-40 ${
            value >= n ? 'text-amber-400' : 'text-stone-300 dark:text-stone-600'
          }`}
          onClick={() => onChange(n)}
        >
          <Star className="h-8 w-8 sm:h-9 sm:w-9" fill={value >= n ? 'currentColor' : 'transparent'} strokeWidth={1.35} aria-hidden />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-stone-600 dark:text-stone-300">{value} / 5</span>
    </div>
  );
}

// ─── Exports ───

export default function ReviewsPage() {
  const { user } = useAuthStore();
  const isSalonWide = user?.role === 'admin' || user?.role === 'staff';
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [feedbackSearch, setFeedbackSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([listAppointments(), listVisitFeedback()])
      .then(([apRes, fbRes]) => {
        setAppointments(apRes.data.data || []);
        setFeedback(fbRes.data.data || []);
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Could not load data.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const reviewedIds = useMemo(() => new Set(feedback.map((f) => f.appointmentId)), [feedback]);

  const eligible = useMemo(
    () =>
      !isSalonWide
        ? appointments.filter((a) => appointmentEligibleForReview(a) && !reviewedIds.has(a.id))
        : [],
    [appointments, reviewedIds, isSalonWide],
  );

  const { register, handleSubmit, reset, control, formState: { isSubmitting } } = useForm<{
    appointmentId: string;
    rating: number;
    comment: string;
  }>({ defaultValues: { appointmentId: '', rating: 5, comment: '' } });

  const onSubmit = async (data: { appointmentId: string; rating: number; comment: string }) => {
    setError('');
    try {
      await createVisitFeedback({
        appointmentId: data.appointmentId,
        rating: Number(data.rating),
        comment: data.comment || undefined,
      });
      reset({ appointmentId: '', rating: 5, comment: '' });
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not submit review.'));
    }
  };

  const startEdit = (row: FeedbackRow) => {
    setEditingId(row.id);
    setEditRating(row.rating);
    setEditComment(row.comment ?? '');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowBusy(null);
  };

  const saveEdit = async (id: string) => {
    setError('');
    setRowBusy(id);
    try {
      await updateVisitFeedback(id, {
        rating: editRating,
        comment: editComment.trim() === '' ? null : editComment,
      });
      cancelEdit();
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not update review.'));
    } finally {
      setRowBusy(null);
    }
  };

  const removeReview = async (id: string) => {
    if (!window.confirm('Remove this review? You can submit a new one for the same visit later.')) return;
    setError('');
    setRowBusy(id);
    try {
      await deleteVisitFeedback(id);
      if (editingId === id) cancelEdit();
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not remove review.'));
    } finally {
      setRowBusy(null);
    }
  };

  const displayedFeedback = useMemo(() => {
    const arr = [...feedback];
    arr.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    const s = feedbackSearch.trim().toLowerCase();
    if (!s) return arr;
    return arr.filter((f) => {
      const blob = [f.comment, f.user?.name, f.user?.email, f.appointment?.service?.name, String(f.rating)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(s);
    });
  }, [feedback, feedbackSearch]);

  return (
    <AuthGuard>
      <div className="page-shell-spacious">
        <header className="page-header">
          <p className="page-eyebrow">Voice</p>
          <h1 className="page-title">Visit reviews</h1>
          <p className="page-lede">
            {isSalonWide
              ? 'Recent feedback left by guests after their appointments.'
              : 'Add a review after your visit ends. You can edit or remove your reviews anytime.'}
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        ) : null}

        {!isSalonWide ? (
          <section className="surface-card rounded-lg p-6 sm:p-8" aria-label="Add a review">
            <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">Add a review</h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              Choose a visit that has already finished (or was marked completed). One review per booking.
            </p>
            {eligible.length === 0 ? (
              <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
                No visits ready for a new review. Upcoming appointments appear here after the visit time passes, unless
                you already left a review.
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="section-label">
                    Visit
                  </label>
                  <select
                    className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                    {...register('appointmentId', { required: true })}
                  >
                    <option value="">Select appointment…</option>
                    {eligible.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.service?.name ?? 'Visit'} — {a.appointmentDate} {a.startTime}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="section-label">
                    Rating
                  </span>
                  <Controller
                    name="rating"
                    control={control}
                    render={({ field }) => (
                      <StarRatingPicker value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="section-label">
                    Comment (optional)
                  </label>
                  <textarea
                    rows={3}
                    className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                    {...register('comment')}
                  />
                </div>
                <Button type="submit" loading={isSubmitting}>
                  Submit review
                </Button>
              </form>
            )}
          </section>
        ) : null}

        <section aria-label={isSalonWide ? 'All feedback' : 'Your reviews'}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">
              {isSalonWide ? 'All feedback' : 'Your reviews'}
            </h2>
            {feedback.length > 0 ? (
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" aria-hidden />
                <input
                  type="search"
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  placeholder="Search comment, guest, service, rating…"
                  className="w-full rounded-md border border-stone-300 bg-[#fffefb] py-2 pl-9 pr-3 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                  aria-label="Search reviews"
                />
              </div>
            ) : null}
          </div>
          {loading ? (
            <div className="mt-6 flex justify-center py-12" role="status" aria-label="Loading reviews">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-600 dark:border-t-stone-200" aria-hidden />
            </div>
          ) : feedback.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">No reviews yet.</p>
          ) : displayedFeedback.length === 0 ? (
            <p className="mt-4 rounded-lg border border-stone-200/80 bg-[#faf7f2] px-4 py-6 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300">
              No reviews match your search.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {displayedFeedback.map((f) => (
                <li key={f.id} className="surface-card rounded-lg p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-stone-900 dark:text-stone-50">{f.rating}/5</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      {f.createdAt ? new Date(f.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  {isSalonWide ? (
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                      {f.user?.name} · {f.appointment?.service?.name} · {f.appointment?.appointmentDate}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                      {f.appointment?.service?.name} · {f.appointment?.appointmentDate}
                    </p>
                  )}
                  {editingId === f.id ? (
                    <div className="mt-4 space-y-3 border-t border-stone-200 pt-4 dark:border-stone-700">
                      <div className="flex flex-col gap-2">
                        <span className="section-label">
                          Rating
                        </span>
                        <StarRatingPicker
                          value={editRating}
                          onChange={setEditRating}
                          disabled={rowBusy === f.id}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="section-label">
                          Comment
                        </label>
                        <textarea
                          rows={3}
                          className="resize-none rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" loading={rowBusy === f.id} onClick={() => void saveEdit(f.id)}>
                          Save changes
                        </Button>
                        <Button type="button" size="sm" variant="secondary" disabled={rowBusy === f.id} onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {f.comment ? (
                        <p className="mt-2 text-sm text-stone-800 dark:text-stone-200">{f.comment}</p>
                      ) : (
                        <p className="mt-2 text-sm italic text-stone-500 dark:text-stone-500">No comment</p>
                      )}
                      {!isSalonWide ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" disabled={rowBusy === f.id} onClick={() => startEdit(f)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={rowBusy === f.id}
                            loading={rowBusy === f.id}
                            onClick={() => void removeReview(f.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
