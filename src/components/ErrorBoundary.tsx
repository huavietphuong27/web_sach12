import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  stack?: string;
}

/** Bắt lỗi render để hiện thông báo thay vì trang trắng. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    const err = error as Error;
    return {
      hasError: true,
      message: String(err?.message || error),
      stack: err?.stack || '',
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0F172A' }}>
          <h1 style={{ color: '#4F46E5', fontSize: 22, fontWeight: 700 }}>Có lỗi xảy ra khi tải trang</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>Bạn thử tải lại trang (F5). Nếu vẫn lỗi, gửi mình nội dung dưới đây:</p>
          <pre
            style={{
              background: '#F1F5F9',
              padding: 12,
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              marginTop: 12,
              fontSize: 13,
              border: '1px solid #E2E8F0',
            }}
          >
            {this.state.message}
            {this.state.stack ? `\n\nStack trace:\n${this.state.stack}` : ''}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
