'use client';

import React from 'react';

class ErrorBoundary extends React.Component<{children: React.ReactNode, name?: string}, { hasError: boolean, error: Error | null }> {
  constructor(props: {children: React.ReactNode, name?: string}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ErrorBoundary [${this.props.name || 'unknown'}] caught error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-2 m-2 bg-red-50 border border-red-200 rounded text-red-800 text-xs font-mono overflow-auto max-h-32">
          <p className="font-bold">Feil i {this.props.name || 'komponent'}</p>
          <p>{this.state.error?.message || 'Ukjent feil'}</p>
          <button 
            className="mt-2 bg-red-100 px-2 py-1 rounded hover:bg-red-200"
            onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
            }}
          >
            Prøv igjen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
