import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('SectionErrorBoundary caught an error:', error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Erreur sur cette section</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cette vue a rencontré une erreur. Vous pouvez recharger uniquement cette section.
              </p>
              <button
                type="button"
                onClick={this.reset}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RotateCcw className="h-4 w-4" />
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default SectionErrorBoundary
