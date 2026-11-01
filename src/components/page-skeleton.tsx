import { Skeleton } from '@/components/ui/skeleton'

// A quiet placeholder aligned with the content shell while code or data loads.
export function PageSkeleton() {
  return <div className="screen flex flex-col gap-8" aria-busy="true" aria-label="Loading">
    <Skeleton className="h-10 w-52" />
    <Skeleton className="h-64 w-full" />
    <div className="space-y-4">{[0, 1, 2].map(n => <Skeleton key={n} className="h-12 w-full" />)}</div>
  </div>
}
