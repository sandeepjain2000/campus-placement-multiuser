'use client';

import { Component } from 'react';
import PageError from '@/components/PageError';
import { reportClientError } from '@/lib/clientErrorReport';

/**
 * Catches render errors inside the dashboard shell so one broken page
 * does not white-screen the entire layout.
 */
export default class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportClientError(error?.message || 'Dashboard page error', {
      source: 'react.error-boundary',
      componentStack: info?.componentStack,
    });
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <PageError
          title="This page encountered a problem"
          error={error}
          reset={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
