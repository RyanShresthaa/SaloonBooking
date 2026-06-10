import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

/** Refetch server-backed lists when the API broadcasts appointment changes. */
export default function RealtimeSync() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();
    const onAppt = () => {
      void qc.invalidateQueries({ queryKey: ['appointments'] });
      void qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
    };
    socket.on('appointment:updated', onAppt);

    return () => {
      socket.off('appointment:updated', onAppt);
      disconnectSocket();
    };
  }, [isAuthenticated, qc]);

  return null;
}
