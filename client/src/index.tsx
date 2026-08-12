import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AppContainer } from '@lark-apaas/client-toolkit/components/AppContainer';
import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

// 简单的错误显示组件，不依赖平台组件库
const SimpleErrorFallback = ({ error }: { error: Error }) => (
  <div style={{ padding: '20px', color: 'red', fontFamily: 'sans-serif' }}>
    <h2>应用出错了</h2>
    <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
      {error.message}
      {'\n'}
      {error.stack}
    </pre>
  </div>
);

const MainApp = () => {
  return (
    <ErrorBoundary fallbackRender={({ error }) => <SimpleErrorFallback error={error} />}>
      <BrowserRouter basename={CLIENT_BASE_PATH}>
        <AppContainer defaultTheme="light">
          <RoutesComponent />
          {createPortal(<Toaster />, document.body)}
        </AppContainer>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
