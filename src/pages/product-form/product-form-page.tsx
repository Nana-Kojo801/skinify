import { CalendarBlank, Check, Drop, Warning } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { BackLink } from '@/components/back-link'
import { OverlapWarning } from '@/components/overlap-warning'
import { PageSkeleton } from '@/components/page-skeleton'
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
        <h1 className="display text-4xl leading-[1.05] md:text-6xl">Product not found</h1>
        <p className="text-base text-ink-2">It may have been deleted, or the link is wrong.</p>
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
  const back = productId ? `/products/${productId}` : '/routine'

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

  return <main className="screen product-form-page">
    <BackLink to={back} label="Back" />
    <header className="screen-heading detail-heading"><h1>{productId ? 'Edit product' : 'Add a product'}</h1></header>
    <div className="product-form-layout"><aside className="form-guide"><ol><li><b>01</b><span>Product<small>Add product details.</small></span></li><li><b>02</b><span>Concern<small>Choose what you’re tracking.</small></span></li><li><b>03</b><span>Start date<small>Set when you started using it.</small></span></li></ol><p>Track one concern at a time.</p></aside>
      <form onSubmit={onSubmit} className="product-form">
        <label className="form-label"><span><small>01 / </small>Product name</span><input value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} maxLength={80} required placeholder="e.g. Niacinamide 10%" className="field" /></label>
        <fieldset><legend className="form-label"><span><small>02 / </small>What are you tracking?</span></legend><div className="concern-options">{CONCERN_KEYS.map(key => <label key={key} className={cn('concern-option', values.targetConcern === key && 'selected')}><input type="radio" name="targetConcern" value={key} checked={values.targetConcern === key} onChange={() => setValues({ ...values, targetConcern: key })} className="sr-only" /><span className="radio-indicator" aria-hidden>{values.targetConcern === key && <Check size={10} weight="bold" />}</span><span>{CONCERNS[key].label}</span></label>)}</div><p className="form-hint">{concernLabel}{latestScore !== undefined ? ` · Latest score ${Math.round(latestScore)} of 100` : ' will be the score this product follows.'}</p></fieldset>
        {overlaps.length > 0 && <OverlapWarning overlaps={overlaps} concern={concernLabel.toLowerCase()} variant="form" />}
        <label className="form-label start-date-field"><span><small>03 / </small>Start date <CalendarBlank size={16} /></span><input type="date" value={values.startDate} onChange={e => setValues({ ...values, startDate: e.target.value })} required className="field" /><span className="form-hint">Scans on or before this date become your baseline.</span></label>
        {error && <p role="alert" className="notice text-irritation-ink"><Warning size={18} />{error}</p>}
        <div className="form-actions"><Link to={back} className={buttonVariants({ variant: 'outline' })}>Cancel</Link><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save product'}</Button></div>
      </form>
    </div>
  </main>
}
