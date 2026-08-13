import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

const SimpleErrorFallback = ({ error }: { error: Error }) => (
  <div style={{ padding: '20px', color: 'red', fontFamily: 'sans-serif' }}>
    <h2>应用出错了</h2>
    <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
      {error.message}
      {'\n'}
      {error.stack}
    </pre>
  </div>
);

const MainApp = () => {
  return (
    <ErrorBoundary fallbackRender={({ error }) => <SimpleErrorFallback error={error} />}>
      <HashRouter>
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
      </HashRouter>
    </ErrorBoundary>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<MainApp />);
}
