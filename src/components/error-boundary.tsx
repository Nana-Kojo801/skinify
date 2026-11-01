import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import { EmptyState } from '@/components/empty-state'
import { Button, buttonVariants } from '@/components/ui/button'

type Props = { children: ReactNode }
type State = { failed: boolean }

// Catches render errors (for example a query that fails) so one broken page shows a calm message instead of a blank app.
// AppShell keys it by route, so moving to another page clears the error.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page failed to render', error.message, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="screen">
        <EmptyState
          variant="page"
          icon={<WarningCircle size={30} />}
          title="Something went wrong"
          description="This page couldn't load. Your data is safe. Try again, or go back home."
          action={
            <>
              <Button size="lg" onClick={() => window.location.reload()}>
                <ArrowClockwise size={18} weight="bold" />
                Try again
              </Button>
              <a href="/" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
                Back home
              </a>
            </>
          }
        />
      </main>
    )
  }
}
