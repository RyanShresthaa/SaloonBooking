import dayjs from 'dayjs';

/** Normalize TIME  */
export function timeToHhmmss(timeVal) {
  if (timeVal == null) return '00:00:00';
  if (typeof timeVal === 'string') {
    if (timeVal.length >= 8) return timeVal.slice(0, 8);
    if (timeVal.length === 5) return `${timeVal}:00`;
    return `${timeVal}`.slice(0, 8);
  }
  return dayjs(timeVal).format('HH:mm:ss');
}

export function parseAppointmentDateTime(appointmentDate, timeVal) {
  return dayjs(`${appointmentDate} ${timeToHhmmss(timeVal)}`);
}

export function getBufferMinutes(serviceLike) {
  return {
    before: Math.max(0, Number(serviceLike?.bufferBeforeMinutes ?? 0) || 0),
    after: Math.max(0, Number(serviceLike?.bufferAfterMinutes ?? 0) || 0),
  };
}

/** Calendar block including cleanup */
export function blockedInterval(appointmentDate, startTime, endTime, serviceLike) {
  const { before, after } = getBufferMinutes(serviceLike);
  const start = parseAppointmentDateTime(appointmentDate, startTime).subtract(before, 'minute');
  const end = parseAppointmentDateTime(appointmentDate, endTime).add(after, 'minute');
  return { start, end };
}

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
}
