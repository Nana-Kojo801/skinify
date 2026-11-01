// Toasts are rare (the "Add to calendar" confirmation), so sonner and its <Toaster /> load on the first toast,
// not with every page. The app shell mounts the Toaster when it hears this event.
export const TOASTER_EVENT = 'receipts:toaster'

export async function showToast(message: string) {
  // Load sonner and the Toaster chunk together, so the Toaster can render as soon as it is mounted.
  const [{ toast }] = await Promise.all([import('sonner'), import('@/components/ui/sonner')])
  window.dispatchEvent(new Event(TOASTER_EVENT))
  // Let the freshly mounted Toaster subscribe before the first toast is sent.
  await new Promise((resolve) => setTimeout(resolve, 50))
  toast.success(message)
}
