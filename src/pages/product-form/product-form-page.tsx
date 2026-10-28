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
    <main className="mx-auto grid max-w-6xl gap-10 px-5 pt-6 pb-20 md:grid-cols-2 md:gap-14 md:px-8 md:pt-10">
      <aside className="relative hidden md:block">
        <img src="/images/product-pour.jpg" alt="" className="aspect-[4/5] w-full rounded-lg object-cover" />
      </aside>
      <div className="flex flex-col justify-center">
        <Link
          to={productId ? `/products/${productId}` : '/'}
          aria-label="Back"
          className="mb-6 flex size-11 items-center justify-center rounded-full border border-white/30 transition-colors hover:border-white/70"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <h1 className="heading text-5xl md:text-6xl">
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
        <p className="mt-3 mb-9 max-w-md text-lg text-white/75">
          Pick the one skin concern it promises to improve. That is the score the verdict will follow.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
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
            Target concern
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
            <span className="text-sm font-normal text-muted-foreground">Scans before this date are your baseline.</span>
          </label>
          {error && (
            <p role="alert" className="rounded-md bg-[#3d1717] px-4 py-3 text-sm text-[#f7c3bd]">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="self-start">
            {pending ? 'Saving…' : 'Save product'}
          </Button>
        </form>
      </div>
    </main>
  )
}
