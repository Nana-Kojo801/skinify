// Shown while a page's code or data loads: soft shimmering blocks instead of a blank flash.
export function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-6 md:px-8 md:pt-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-48 rounded-full" />
      <div className="skeleton h-56 md:h-72" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
    </div>
  )
}
