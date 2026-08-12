import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { createPortal } from 'react-dom';
import RoutesComponent from './app.tsx';
import './index.css';
import { Toaster } from '@client/src/components/ui/sonner';

console.log('=== 木姐外卖前端启动 ===');
console.log('所有模块加载成功');

const CLIENT_BASE_PATH = process.env.CLIENT_BASE_PATH || '/';

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
  console.log('MainApp 开始渲染');
  return (
    <ErrorBoundary fallbackRender={({ error }) => {
      console.error('ErrorBoundary 捕获到错误:', error);
      return <SimpleErrorFallback error={error} />;
    }}>
      <BrowserRouter basename={CLIENT_BASE_PATH}>
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
      </BrowserRouter>
    </ErrorBoundary>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('找到 root 元素，开始渲染');
  createRoot(rootElement).render(<MainApp />);
  console.log('render 调用完成');
}
