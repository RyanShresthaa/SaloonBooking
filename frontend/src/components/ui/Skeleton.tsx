export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-stone-200/80 dark:bg-stone-700/50 ${className}`} aria-hidden />;
}

export function TableRowSkeleton({ cols = 7 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[8rem]" />
        </td>
      ))}
    </tr>
  );
}
