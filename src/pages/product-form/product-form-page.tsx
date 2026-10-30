import { CaretLeft, Warning } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { PageSkeleton } from '@/components/page-skeleton'
import { ScoreRing } from '@/components/score-ring'
import { Button, buttonVariants } from '@/components/ui/button'
import { fromDateInputValue, toDateInputValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CONCERN_KEYS, CONCERNS, isConcernKey } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

// One page for both /products/new and /products/:id/edit.
export function ProductFormPage() {
  const { id } = useParams()
  const product = useQuery(api.products.get, id ? { productId: id as Id<'products'> } : 'skip')
  const [today] = useState(() => toDateInputValue(Date.now()))
  // "Test this" on an idea opens /products/new?concern=pore&name=Niacinamide: only a known concern and a short name are used.
  const [search] = useSearchParams()
  const hintedConcern = search.get('concern')
  const hintedName = (search.get('name') ?? '').slice(0, 60)
  if (id && product === undefined) return <PageSkeleton />
  if (id && product === null) {
    return (
      <main className="mx-auto max-w-md px-5 pt-16 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link to="/" className={buttonVariants({ variant: 'soft', className: 'mt-5' })}>
          Back home
        </Link>
      </main>
    )
  }
  return (
    <ProductForm
      productId={id as Id<'products'> | undefined}
      initial={
        product
          ? { name: product.name, targetConcern: product.targetConcern, startDate: toDateInputValue(product.startDate) }
          : {
              name: hintedName,
              targetConcern: hintedConcern !== null && isConcernKey(hintedConcern) ? hintedConcern : CONCERN_KEYS[0],
              startDate: today,
            }
      }
    />
  )
}

type Values = { name: string; targetConcern: string; startDate: string }

function ProductForm({ productId, initial }: { productId?: Id<'products'>; initial: Values }) {
  const navigate = useNavigate()
  const create = useMutation(api.products.create)
  const update = useMutation(api.products.update)
  const latest = useQuery(api.scans.latest)
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const back = productId ? `/products/${productId}` : '/'

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const startDate = fromDateInputValue(values.startDate)
    try {
      if (productId) {
        await update({ productId, name: values.name, targetConcern: values.targetConcern, startDate })
        void navigate(`/products/${productId}`)
      } else {
        const newId = await create({ name: values.name, targetConcern: values.targetConcern, startDate })
        void navigate(`/products/${newId}`)
      }
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data.message) : 'Could not save the product. Try again.')
      setPending(false)
    }
  }

  const concernLabel = isConcernKey(values.targetConcern) ? CONCERNS[values.targetConcern].label : values.targetConcern
  const latestScore = latest?.scores[values.targetConcern]

  return (
    <main className="mx-auto max-w-6xl md:grid md:grid-cols-[0.8fr_1.2fr] md:items-start md:gap-12 md:px-8 md:pt-8">
      <aside className="photo relative hidden overflow-hidden rounded-[32px] md:sticky md:top-28 md:block md:aspect-[4/5]">
        <img src="/images/product-pour.webp" alt="" className="settle size-full object-cover" />
      </aside>

      <div className="px-4 md:px-0">
        <header className="flex h-16 items-center md:h-auto">
          <Link to={back} aria-label="Back" className="press -ml-1 flex min-h-11 items-center gap-2 font-semibold">
            <span className="grid size-10 place-items-center rounded-full bg-sand">
              <CaretLeft size={18} weight="bold" />
            </span>
            {productId ? initial.name : 'Products'}
          </Link>
        </header>

        <section className="rise mt-2 px-1 md:mt-6">
          <h1 className="text-[36px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">{productId ? 'Edit product' : 'New product'}</h1>
          <p className="mt-2 max-w-md text-muted md:text-[17px]">Pick the one skin concern it promises to improve. That is the score the verdict will follow.</p>
        </section>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
          <label className="rise flex flex-col gap-1.5 text-[13.5px] font-semibold" style={{ '--i': 1 } as React.CSSProperties}>
            Product name
            <input
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              maxLength={80}
              required
              placeholder="e.g. Niacinamide 10% serum"
              className="field"
            />
          </label>

          <fieldset className="rise" style={{ '--i': 2 } as React.CSSProperties}>
            <legend className="mb-2 text-[13.5px] font-semibold">Target concern</legend>
            <div className="grid grid-cols-2 gap-2">
              {CONCERN_KEYS.map((key) => {
                const checked = values.targetConcern === key
                return (
                  <label
                    key={key}
                    className={cn(
                      'press relative flex min-h-16 cursor-pointer items-center gap-3 rounded-[18px] border-[1.5px] px-3.5 py-2.5 transition-[background-color,border-color,box-shadow] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-cocoa',
                      checked ? 'border-cocoa bg-card shadow-(--shadow-raised)' : 'border-transparent bg-sand shadow-(--shadow-inset) hover:bg-nude/60',
                    )}
                  >
                    <input
                      type="radio"
                      name="targetConcern"
                      value={key}
                      checked={checked}
                      onChange={() => setValues({ ...values, targetConcern: key })}
                      className="sr-only"
                    />
                    <span className={cn('grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-colors', checked ? 'border-cocoa bg-cocoa' : 'border-nude')}>
                      {checked && <span className="size-2 animate-[pop_.3s_var(--ease-pop)_both] rounded-full bg-cream" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] leading-tight font-semibold">{CONCERNS[key].label}</span>
                      <span className="block text-[12.5px] leading-snug text-muted">{CONCERNS[key].hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="tile rise flex items-center gap-4 rounded-3xl px-4 py-3.5" style={{ '--i': 3 } as React.CSSProperties}>
            {latestScore !== undefined && <ScoreRing key={values.targetConcern} value={latestScore} size={56} />}
            <p className="text-[15px] text-cocoa-soft">
              The verdict will follow your <strong className="font-semibold text-cocoa">{concernLabel.toLowerCase()}</strong> score
              {latestScore !== undefined ? `. Latest scan: ${Math.round(latestScore)} of 100.` : '.'}
            </p>
          </div>

          <label className="rise flex flex-col gap-1.5 text-[13.5px] font-semibold" style={{ '--i': 4 } as React.CSSProperties}>
            Start date
            <input type="date" value={values.startDate} onChange={(e) => setValues({ ...values, startDate: e.target.value })} required className="field" />
            <span className="text-[13px] font-normal text-muted">Scans before this date are your baseline.</span>
          </label>

          {error && (
            <p role="alert" className="flex items-start gap-2.5 rounded-2xl bg-irritation-bg px-4 py-3 text-sm text-irritation-ink">
              <Warning size={18} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <div className="sticky bottom-3 z-20 -mx-1 grid grid-cols-[auto_1fr] gap-2 rounded-full bg-card p-2 shadow-(--shadow-float) md:static md:mx-0 md:flex md:justify-end md:bg-transparent md:p-0 md:shadow-none">
            <Link to={back} className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
              Cancel
            </Link>
            <Button type="submit" size="lg" disabled={pending} className="md:px-10">
              {pending ? 'Saving…' : 'Save product'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
