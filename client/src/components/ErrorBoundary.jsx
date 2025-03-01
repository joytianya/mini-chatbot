import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '12px',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          border: '1px solid rgba(255, 0, 0, 0.2)',
          borderRadius: '8px',
          color: 'inherit',
          fontSize: '14px'
        }}>
          内容渲染出现错误，已跳过复杂格式
        </div>
      );
    }
    return this.props.children;
  }
} 