import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { listAppointments } from '@/lib/api/appointments';
import { listVisitFeedback, createVisitFeedback, updateVisitFeedback, deleteVisitFeedback } from '@/lib/api/visitFeedback';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';

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

function formatTimeForParse(t: string | undefined): string {
  if (t == null || t === '') return '00:00:00';
  if (typeof t === 'string') {
    if (t.length >= 8) return t.slice(0, 8);
    if (t.length === 5) return `${t}:00`;
    return `${t}`.slice(0, 8);
  }
  return dayjs(t).format('HH:mm:ss');
}

/** Matches server: after visit end, or staff marked completed. */
function appointmentEligibleForReview(a: Appt): boolean {
  if (a.status === 'cancelled') return false;
  if (a.status === 'completed') return true;
  if (a.status !== 'pending' && a.status !== 'confirmed') return false;
  const endStr = formatTimeForParse(a.endTime ?? a.startTime);
  const visitEnd = dayjs(`${a.appointmentDate} ${endStr}`);
  return !dayjs().isBefore(visitEnd);
}

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
    load();
  }, [load]);

  const reviewedIds = useMemo(() => new Set(feedback.map((f) => f.appointmentId)), [feedback]);

  const eligible = useMemo(
    () =>
      !isSalonWide
        ? appointments.filter((a) => appointmentEligibleForReview(a) && !reviewedIds.has(a.id))
        : [],
    [appointments, reviewedIds, isSalonWide]
  );

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
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

  return (
    <AuthGuard>
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="border-b border-stone-300/50 pb-8 dark:border-stone-600/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">Voice</p>
          <h1 className="font-display text-3xl text-stone-900 dark:text-stone-50 sm:text-4xl">Visit reviews</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
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
          <section className="surface-card rounded-lg p-6 sm:p-8">
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
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                    Rating (1–5)
                  </label>
                  <select
                    className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                    {...register('rating', { valueAsNumber: true })}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
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

        <section>
          <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">
            {isSalonWide ? 'All feedback' : 'Your reviews'}
          </h2>
          {loading ? (
            <div className="mt-6 flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-600 dark:border-t-stone-200" />
            </div>
          ) : feedback.length === 0 ? (
            <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">No reviews yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {feedback.map((f) => (
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
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                          Rating
                        </label>
                        <select
                          className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                          value={editRating}
                          onChange={(e) => setEditRating(Number(e.target.value))}
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
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
                        <Button type="button" size="sm" loading={rowBusy === f.id} onClick={() => saveEdit(f.id)}>
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
                            onClick={() => removeReview(f.id)}
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
