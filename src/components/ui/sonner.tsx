import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react'

// Small confirmations ("Saved a weekly event…"). Dark only; sits above the phone's bottom navigation.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      mobileOffset={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
      icons={{
        success: <CheckCircleIcon className="size-5 text-primary" weight="fill" />,
        info: <InfoIcon className="size-5" />,
        warning: <WarningIcon className="size-5" />,
        error: <XCircleIcon className="size-5" />,
      }}
      style={
        {
          '--normal-bg': 'var(--color-soft)',
          '--normal-text': 'var(--color-ink)',
          '--normal-border': 'var(--color-hair)',
          '--border-radius': '18px',
          fontFamily: 'inherit',
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: 'text-sm', description: 'text-ink-2' } }}
      {...props}
    />
  )
}

export { Toaster }
