// Shown while a page's code or data loads: soft shimmering tiles in the Bento layout instead of a blank flash.
export function PageSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-3 pt-4 md:px-10 md:pt-10" aria-busy="true" aria-label="Loading">
      <div className="skeleton ml-2 h-4 w-36 rounded-full" />
      <div className="skeleton ml-2 h-11 w-52 rounded-2xl md:h-16 md:w-80" />
      <div className="mt-3 grid gap-3 md:grid-cols-12 md:gap-3.5">
        <div className="skeleton h-[380px] md:col-span-7" />
        <div className="grid grid-cols-2 gap-3 md:col-span-5 md:grid-cols-1 md:gap-3.5">
          <div className="skeleton h-40 md:h-[118px]" />
          <div className="skeleton h-40 md:h-24" />
          <div className="skeleton col-span-2 h-24 md:col-span-1 md:h-[118px]" />
        </div>
      </div>
    </div>
  )
}
