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
  if (id && product === undefined) return <p className="p-4 text-sm text-neutral-500">Loading…</p>
  if (id && product === null) return <p className="p-4 text-sm">Product not found.</p>
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
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-xl font-semibold">{productId ? 'Edit product' : 'New product'}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Product name
          <input
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            maxLength={80}
            required
            placeholder="e.g. Niacinamide 10% serum"
            className="rounded-md border px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Which concern does it target?
          <select
            value={values.targetConcern}
            onChange={(e) => setValues({ ...values, targetConcern: e.target.value })}
            className="rounded-md border px-3 py-2 text-base"
          >
            {CONCERN_KEYS.map((key) => (
              <option key={key} value={key}>
                {CONCERNS[key].label} ({CONCERNS[key].hint})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Start date
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => setValues({ ...values, startDate: e.target.value })}
            required
            className="rounded-md border px-3 py-2 text-base"
          />
          <span className="text-xs text-neutral-500">Scans before this date are your baseline.</span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Link to={productId ? `/products/${productId}` : '/'} className="text-center text-sm underline">
          Cancel
        </Link>
      </form>
    </main>
  )
}
