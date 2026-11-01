import { CalendarBlank, Check, Drop, Warning } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BackLink } from '@/components/back-link'
import { OverlapWarning } from '@/components/overlap-warning'
import { PageSkeleton } from '@/components/page-skeleton'
import { ScoreRing } from '@/components/score-ring'
import { Button, buttonVariants } from '@/components/ui/button'
import { fromDateInputValue, toDateInputValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CONCERN_KEYS, CONCERNS, isConcernKey } from '@shared/concerns'
import { overlapsFor } from '@shared/products/overlap'
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
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 pt-32 text-center md:pt-40">
        <span className="tile grid size-[92px] place-items-center rounded-[32px]" aria-hidden>
          <Drop size={40} />
        </span>
        <h1 className="display text-[32px] leading-[1.05] md:text-[48px]">Product not found</h1>
        <p className="text-[15.5px] text-ink-2">It may have been deleted, or the link is wrong.</p>
        <Link to="/" className={buttonVariants({ variant: 'soft', size: 'lg' })}>
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
  const products = useQuery(api.products.list)
  const [values, setValues] = useState(initial)
  const [now] = useState(() => Date.now())
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
  // Heads-up only (never blocks saving): another active product on this concern that started close to this one.
  const overlaps = overlapsFor(
    {
      id: productId,
      targetConcern: values.targetConcern,
      startDate: fromDateInputValue(values.startDate),
      // An ended product being edited has no overlaps; a product that is about to be created is active.
      endDate: products?.find((p) => p._id === productId)?.endDate,
    },
    products ?? [],
    now,
  )

  return (
    <main className="product-form-page">
      <header className="flex h-14 items-center px-1">
        <BackLink to={back} label={productId ? initial.name : 'Products'} ariaLabel="Back" />
      </header>

      <div className="product-form-layout">
        <aside className="form-editorial"><p className="kicker">THE ROUTINE / A NEW ENTRY</p><h2>One product.<br /><em>One question.</em></h2><p>What would you like this product to change? Follow one concern, and give the evidence time to build.</p><div className="form-rule"><span>01</span><p><strong>Name your product</strong>Use the label on the bottle.</p></div><div className="form-rule"><span>02</span><p><strong>Choose one concern</strong>A clear question makes a useful comparison.</p></div><div className="form-rule"><span>03</span><p><strong>Mark the beginning</strong>Earlier scans become your baseline.</p></div></aside>
        <div className="form-content">
          <section className="rise px-2 md:px-1">
            <h1 className="display text-[38px] leading-[1.02] md:text-[52px]">{productId ? 'Edit product' : 'New product'}</h1>
            <p className="mt-2 max-w-md text-[15.5px] text-ink-2 md:text-[17px]">Pick the one skin concern it promises to improve. That is the score the verdict will follow.</p>
          </section>

          <form onSubmit={onSubmit} className="product-form-fields">
            <label className="rise flex flex-col gap-1.5 text-sm font-bold" style={{ '--i': 1 } as React.CSSProperties}>
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
              <legend className="mb-2 text-sm font-bold">Target concern</legend>
              <div className="concern-options">
                {CONCERN_KEYS.map((key) => {
                  const checked = values.targetConcern === key
                  return (
                    <label
                      key={key}
                      className={cn(
                        'concern-option',
                        checked ? 'is-selected' : '',
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
                      <span className="block text-[15px] leading-tight font-bold">{CONCERNS[key].label}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{CONCERNS[key].hint}</span>
                      {checked && (
                        <span className="absolute top-2.5 right-2.5 grid size-[22px] animate-[pop_.4s_var(--ease-spring)_both] place-items-center rounded-full bg-ink text-accent">
                          <Check size={12} weight="bold" />
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {overlaps.length > 0 && <OverlapWarning overlaps={overlaps} concern={concernLabel.toLowerCase()} variant="form" className="rise" />}

            <div className="rise flex items-center gap-4 rounded-[20px] bg-well px-4 py-3.5" style={{ '--i': 3 } as React.CSSProperties}>
              {latestScore !== undefined && <ScoreRing key={values.targetConcern} value={latestScore} size={56} numberClassName="text-[17px]" />}
              <p className="text-[14.5px] leading-snug text-ink-2">
                The verdict will follow your <strong className="font-bold text-ink">{concernLabel.toLowerCase()}</strong> score
                {latestScore !== undefined ? `. Latest scan: ${Math.round(latestScore)} of 100.` : '.'}
              </p>
            </div>

            <label className="rise flex flex-col gap-1.5 text-sm font-bold" style={{ '--i': 4 } as React.CSSProperties}>
              <span className="flex items-center gap-1.5">
                <CalendarBlank size={16} weight="bold" />
                Start date
              </span>
              <input type="date" value={values.startDate} onChange={(e) => setValues({ ...values, startDate: e.target.value })} required className="field" />
              <span className="text-[13px] font-medium text-ink-2">Scans before this date are your baseline.</span>
            </label>

            {error && (
              <p role="alert" className="pop-in flex items-start gap-2.5 rounded-[20px] bg-irritation-bg px-4 py-3 text-sm font-semibold text-irritation-ink">
                <Warning size={18} weight="bold" className="mt-px shrink-0" />
                {error}
              </p>
            )}

            <div className="form-actions">
              <Link to={back} className={buttonVariants({ variant: 'soft', size: 'lg' })}>
                Cancel
              </Link>
              <Button type="submit" size="lg" disabled={pending} className="md:px-10">
                {pending ? 'Saving…' : 'Save product'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
