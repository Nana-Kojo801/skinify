import { ArrowLeft } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { fromDateInputValue, toDateInputValue } from '@/lib/format'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

// One page for both /products/new and /products/:id/edit.
export function ProductFormPage() {
  const { id } = useParams()
  const product = useQuery(api.products.get, id ? { productId: id as Id<'products'> } : 'skip')
  const [today] = useState(() => toDateInputValue(Date.now()))
  if (id && product === undefined) return <p className="p-5 text-sm text-muted-foreground">Loading…</p>
  if (id && product === null) return <p className="p-5 text-sm">Product not found.</p>
  return (
    <ProductForm
      productId={id as Id<'products'> | undefined}
      initial={
        product
          ? { name: product.name, targetConcern: product.targetConcern, startDate: toDateInputValue(product.startDate) }
          : { name: '', targetConcern: CONCERN_KEYS[0], startDate: today }
      }
    />
  )
}

type Values = { name: string; targetConcern: string; startDate: string }

function ProductForm({ productId, initial }: { productId?: Id<'products'>; initial: Values }) {
  const navigate = useNavigate()
  const create = useMutation(api.products.create)
  const update = useMutation(api.products.update)
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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

  return (
    <main className="mx-auto max-w-md px-5 pt-4 pb-12">
      <Link
        to={productId ? `/products/${productId}` : '/'}
        aria-label="Back"
        className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary active:scale-95"
      >
        <ArrowLeft size={20} weight="bold" />
      </Link>
      <h1 className="display mb-6">
        {productId ? (
          <>
            Edit <strong>product</strong>
          </>
        ) : (
          <>
            New <strong>product</strong>
          </>
        )}
      </h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm font-medium">
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
        <label className="flex flex-col gap-2 text-sm font-medium">
          Which concern does it target?
          <select value={values.targetConcern} onChange={(e) => setValues({ ...values, targetConcern: e.target.value })} className="field">
            {CONCERN_KEYS.map((key) => (
              <option key={key} value={key}>
                {CONCERNS[key].label} ({CONCERNS[key].hint})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Start date
          <input type="date" value={values.startDate} onChange={(e) => setValues({ ...values, startDate: e.target.value })} required className="field" />
          <span className="text-xs font-normal text-muted-foreground">Scans before this date are your baseline.</span>
        </label>
        {error && (
          <p role="alert" className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-medium text-red-900">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Saving…' : 'Save product'}
        </Button>
      </form>
    </main>
  )
}
