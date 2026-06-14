import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listStaffTeam,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
  seedDemoStaff,
  listStaffTimeOff,
  createStaffTimeOff,
  deleteStaffTimeOff,
  type StaffTimeOffRow,
} from '@/lib/api/staff';
import AuthGuard from '@/components/layout/AuthGuard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/lib/utils/apiError';

// ─── Constants ───

const PASSWORD_MIN_CHARS = 6;

// ─── Exports ───

export default function StaffAdminPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [seedBanner, setSeedBanner] = useState('');
  const [addBanner, setAddBanner] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formReason, setFormReason] = useState('');
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'staff' | 'admin'>('staff');
  const [addSpeciality, setAddSpeciality] = useState('');
  const [addStaffNotes, setAddStaffNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'staff' | 'admin'>('staff');
  const [editSpeciality, setEditSpeciality] = useState('');
  const [editStaffNotes, setEditStaffNotes] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const teamQuery = useQuery({
    queryKey: ['staff-team'],
    queryFn: async () => {
      const res = await listStaffTeam();
      return res.data.data;
    },
    enabled: user?.role === 'admin',
  });

  const timeOffQuery = useQuery({
    queryKey: ['staff-time-off'],
    queryFn: async () => {
      const res = await listStaffTimeOff();
      return (res.data.data || []) as StaffTimeOffRow[];
    },
    enabled: user?.role === 'admin',
  });

  const createStaffMutation = useMutation({
    mutationFn: () =>
      createStaffMember({
        name: addName.trim(),
        email: addEmail.trim(),
        password: addPassword,
        role: addRole,
        speciality: addSpeciality.trim() || undefined,
        staffNotes: addStaffNotes.trim() || undefined,
      }),
    onSuccess: (res) => {
      setError('');
      setSeedBanner('');
      setAddBanner(String((res.data as { message?: string }).message ?? 'Team member added.'));
      setAddPassword('');
      setAddSpeciality('');
      setAddStaffNotes('');
      void queryClient.invalidateQueries({ queryKey: ['staff-team'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-assignees'] });
    },
    onError: (e: unknown) => {
      setAddBanner('');
      setError(getApiErrorMessage(e, 'Could not add team member.'));
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateStaffMember>[1] }) =>
      updateStaffMember(id, body),
    onSuccess: (res) => {
      setError('');
      setAddBanner('');
      setSeedBanner('');
      setEditingId(null);
      setEditPassword('');
      setAddBanner(String((res.data as { message?: string }).message ?? 'Saved.'));
      void queryClient.invalidateQueries({ queryKey: ['staff-team'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-assignees'] });
    },
    onError: (e: unknown) => {
      setError(getApiErrorMessage(e, 'Could not update team member.'));
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: string) => deleteStaffMember(id),
    onSuccess: (_, deletedId) => {
      setError('');
      setEditingId((cur) => (cur === deletedId ? null : cur));
      setFormUserId((fid) => (fid === deletedId ? '' : fid));
      void queryClient.invalidateQueries({ queryKey: ['staff-team'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-time-off'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-assignees'] });
    },
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Could not remove team member.')),
  });

  const seedMutation = useMutation({
    mutationFn: () => seedDemoStaff(),
    onSuccess: (res) => {
      setError('');
      setAddBanner('');
      setSeedBanner(String((res.data as { message?: string }).message ?? 'Done.'));
      void queryClient.invalidateQueries({ queryKey: ['staff-team'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-assignees'] });
    },
    onError: (e: unknown) => {
      setSeedBanner('');
      setError(getApiErrorMessage(e, 'Could not create demo staff.'));
    },
  });

  const createOffMutation = useMutation({
    mutationFn: () =>
      createStaffTimeOff({
        userId: formUserId,
        startDate: formStart,
        endDate: formEnd,
        reason: formReason.trim() || undefined,
      }),
    onSuccess: () => {
      setError('');
      setFormReason('');
      void queryClient.invalidateQueries({ queryKey: ['staff-time-off'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-assignees'] });
    },
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Could not save time off.')),
  });

  const deleteTimeOffMutation = useMutation({
    mutationFn: (id: string) => deleteStaffTimeOff(id),
    onSuccess: () => {
      setError('');
      void queryClient.invalidateQueries({ queryKey: ['staff-time-off'] });
    },
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Could not remove time off.')),
  });

  const team = useMemo(() => teamQuery.data?.team ?? [], [teamQuery.data?.team]);
  const salonHours = teamQuery.data?.salonHours;

  const syncFormUser = useCallback(() => {
    if (!formUserId && team.length > 0) {
      setFormUserId(team[0].id);
    }
  }, [formUserId, team]);

  useEffect(() => {
    queueMicrotask(() => {
      syncFormUser();
    });
  }, [syncFormUser]);

  if (user?.role !== 'admin') {
    return (
      <AuthGuard>
        <div className="page-shell-form py-16 text-center">
          <p className="text-stone-600 dark:text-stone-400">Only salon admins can manage staff here.</p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-semibold text-stone-800 underline dark:text-stone-200">
            Back to overview
          </Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="page-shell-staff">
        <header className="page-header">
          <p className="page-eyebrow">Admin</p>
          <h1 className="page-title">Staff &amp; hours</h1>
          <p className="page-lede">
            Add stylists or admins, default desk hours used by the slot engine, and leave blocks that hide someone from
            the calendar.
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
            {error}
          </div>
        ) : null}

        <section className="surface-card rounded-lg p-6 sm:p-8">
          <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">Default desk hours</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            {salonHours
              ? `Open ${salonHours.businessStart}–${salonHours.businessEnd}, lunch break ${salonHours.breakStart}–${salonHours.breakEnd}. ${salonHours.timezoneNote}`
              : 'Loading…'}
          </p>
        </section>

        <section className="surface-card rounded-lg p-6 sm:p-8">
          <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">Team</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Create accounts with the password you choose (min {PASSWORD_MIN_CHARS} characters). New members are email-verified so they can
            sign in immediately. Optional speciality shows in appointment &quot;Assigned staff&quot; lists; notes are
            internal to this page.
          </p>

          <form
            className="mt-8 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              setAddBanner('');
              setSeedBanner('');
              if (!addName.trim() || !addEmail.trim() || addPassword.length < PASSWORD_MIN_CHARS) {
                setError(`Name, email, and a password of at least ${PASSWORD_MIN_CHARS} characters are required.`);
                return;
              }
              createStaffMutation.mutate();
            }}
          >
            <Input label="Full name" value={addName} onChange={(e) => setAddName(e.target.value)} required />
            <Input label="Work email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} required />
            <Input
              label="Initial password"
              type="password"
              autoComplete="new-password"
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="section-label">
                Role
              </label>
              <select
                className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as 'staff' | 'admin')}
              >
                <option value="staff">Stylist / staff</option>
                <option value="admin">Salon admin</option>
              </select>
              <p className="text-xs text-stone-500 dark:text-stone-500">
                Admins have full dashboard access. Only promote people you trust.
              </p>
            </div>
            <Input
              label="Speciality (optional)"
              placeholder="e.g. colour, barbering, extensions"
              value={addSpeciality}
              onChange={(e) => setAddSpeciality(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="Other notes (optional)"
                placeholder="Internal reference — not shown to customers"
                value={addStaffNotes}
                onChange={(e) => setAddStaffNotes(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={createStaffMutation.isPending}>
                Add team member
              </Button>
            </div>
          </form>

          {addBanner ? <p className="mt-4 text-sm text-emerald-800 dark:text-emerald-300">{addBanner}</p> : null}

          <div className="mt-10 border-t border-stone-200 pt-8 dark:border-stone-700">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-display text-lg text-stone-900 dark:text-stone-50">Sandbox demo stylists</h3>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                  One-click four fixed demo accounts for testing booking (same password as configured on the server).
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                loading={seedMutation.isPending}
                onClick={() => {
                  setError('');
                  setSeedBanner('');
                  setAddBanner('');
                  seedMutation.mutate();
                }}
              >
                Add demo stylists
              </Button>
            </div>
            {seedBanner ? <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">{seedBanner}</p> : null}
            <p className="mt-4 text-xs text-stone-500 dark:text-stone-500">
              Uses <code className="rounded bg-stone-100 px-1 dark:bg-stone-900">STAFF_SEED_PASSWORD</code> in
              production, or the dev default documented in deployment notes. Emails: maya.chen@salon-desk.demo and three
              others.
            </p>
          </div>

          {teamQuery.isError ? (
            <p className="mt-6 text-sm text-red-800 dark:text-red-200">
              Could not load team: {getApiErrorMessage(teamQuery.error, 'Request failed.')}
            </p>
          ) : null}
          {teamQuery.isLoading ? (
            <p className="mt-6 text-sm text-stone-500">Loading team…</p>
          ) : team.length === 0 ? (
            <p className="mt-6 text-sm text-stone-600 dark:text-stone-400">No team members yet — add someone above or use the sandbox button.</p>
          ) : (
            <ul className="mt-6 divide-y divide-stone-200 dark:divide-stone-700">
              {team.map((m) => (
                <li key={m.id} className="py-4 text-sm">
                  {editingId === m.id ? (
                    <form
                      className="rounded-lg border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-600 dark:bg-stone-900/40"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setError('');
                        if (!editName.trim() || !editEmail.trim()) {
                          setError('Name and email are required.');
                          return;
                        }
                        if (editPassword.length > 0 && editPassword.length < PASSWORD_MIN_CHARS) {
                          setError(
                            `New password must be at least ${PASSWORD_MIN_CHARS} characters, or leave blank to keep the current one.`,
                          );
                          return;
                        }
                        updateStaffMutation.mutate({
                          id: m.id,
                          body: {
                            name: editName.trim(),
                            email: editEmail.trim(),
                            role: editRole,
                            speciality: editSpeciality.trim() || null,
                            staffNotes: editStaffNotes.trim() || null,
                            ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
                          },
                        });
                      }}
                    >
                      <p className="mb-3 section-label">
                        Edit team member
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input label="Full name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                        <Input label="Work email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
                        <div className="flex flex-col gap-1.5">
                          <label className="section-label">
                            Role
                          </label>
                          <select
                            className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as 'staff' | 'admin')}
                          >
                            <option value="staff">Stylist / staff</option>
                            <option value="admin">Salon admin</option>
                          </select>
                        </div>
                        <Input
                          label="New password (optional)"
                          type="password"
                          autoComplete="new-password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Leave blank to keep current"
                        />
                        <Input
                          label="Speciality (optional)"
                          value={editSpeciality}
                          onChange={(e) => setEditSpeciality(e.target.value)}
                        />
                        <div className="sm:col-span-2">
                          <Input
                            label="Other notes (optional)"
                            value={editStaffNotes}
                            onChange={(e) => setEditStaffNotes(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          <Button type="submit" size="sm" loading={updateStaffMutation.isPending}>
                            Save changes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={updateStaffMutation.isPending}
                            onClick={() => {
                              setEditingId(null);
                              setEditPassword('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="font-medium text-stone-900 dark:text-stone-100">{m.name}</span>
                            <span className="text-stone-600 dark:text-stone-400">{m.email}</span>
                            <span className="rounded bg-stone-200/70 px-2 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                              {m.role}
                            </span>
                          </div>
                          {m.speciality ? (
                            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                              <span className="font-semibold text-stone-700 dark:text-stone-300">Speciality:</span>{' '}
                              {m.speciality}
                            </p>
                          ) : null}
                          {m.staffNotes ? (
                            <p className="mt-1 text-xs text-stone-500 dark:text-stone-500">
                              <span className="font-semibold">Notes:</span> {m.staffNotes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setError('');
                              setEditingId(m.id);
                              setEditName(m.name);
                              setEditEmail(m.email);
                              setEditRole(m.role === 'admin' ? 'admin' : 'staff');
                              setEditSpeciality(m.speciality ?? '');
                              setEditStaffNotes(m.staffNotes ?? '');
                              setEditPassword('');
                            }}
                          >
                            Edit
                          </Button>
                          {user?.id !== m.id ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              loading={deleteStaffMutation.isPending}
                              disabled={deleteStaffMutation.isPending}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Remove ${m.name} from the team? They will no longer be able to sign in. This cannot be undone.`
                                  )
                                ) {
                                  return;
                                }
                                deleteStaffMutation.mutate(m.id);
                              }}
                            >
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-card rounded-lg p-6 sm:p-8">
          <h2 className="font-display text-xl text-stone-900 dark:text-stone-50">Time off (leave)</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            While a block covers a date, that stylist cannot be assigned and slot search with them selected returns no
            times.
          </p>

          <form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!formUserId || !formStart || !formEnd) {
                setError('Choose stylist and start/end dates.');
                return;
              }
              createOffMutation.mutate();
            }}
          >
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="section-label">
                Team member
              </label>
              <select
                className="rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus-ring dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {team.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
            <Input label="Start date" type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} required />
            <Input label="End date" type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} required />
            <div className="sm:col-span-2">
              <Input label="Reason (optional)" value={formReason} onChange={(e) => setFormReason(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={createOffMutation.isPending} disabled={team.length === 0}>
                Save time off
              </Button>
            </div>
          </form>

          <div className="mt-10">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">Upcoming &amp; past blocks</h3>
            {timeOffQuery.isLoading ? (
              <p className="mt-3 text-sm text-stone-500">Loading…</p>
            ) : !timeOffQuery.data?.length ? (
              <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">No time off rows yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-700">
                {timeOffQuery.data.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        {row.staffMember?.name ?? row.userId}
                      </span>
                      <span className="ml-2 text-stone-600 dark:text-stone-400">
                        {row.startDate} → {row.endDate}
                      </span>
                      {row.reason ? <p className="text-xs text-stone-500">{row.reason}</p> : null}
                    </div>
                    <Button type="button" size="sm" variant="secondary" onClick={() => deleteTimeOffMutation.mutate(row.id)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
