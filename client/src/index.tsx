import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('=== 木姐外卖前端启动 ===');
console.log('1. 开始加载模块...');

try {
  const { BrowserRouter } = require('react-router-dom');
  console.log('2. react-router-dom 加载成功');

  const { ErrorBoundary } = require('react-error-boundary');
  console.log('3. react-error-boundary 加载成功');

  const RoutesComponent = require('./app.tsx').default;
  console.log('4. app.tsx 加载成功');

  require('./index.css');
  console.log('5. CSS 加载成功');

  const { Toaster } = require('@client/src/components/ui/sonner');
  console.log('6. Toaster 加载成功');

  const { createPortal } = require('react-dom');

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
    console.log('7. MainApp 开始渲染');
    return (
      <ErrorBoundary fallbackRender={({ error }) => {
        console.error('ErrorBoundary 捕获到错误:', error);
        return <SimpleErrorFallback error={error} />;
      }}>
        <BrowserRouter basename={CLIENT_BASE_PATH}>
          <RoutesComponent />
          {createPortal(React.createElement(Toaster), document.body)}
        </BrowserRouter>
      </ErrorBoundary>
    );
  };

  const rootElement = document.getElementById('root');
  if (rootElement) {
    console.log('8. 找到 root 元素，开始渲染');
    createRoot(rootElement).render(<MainApp />);
    console.log('9. render 调用完成');
  } else {
    console.error('错误：找不到 root 元素');
  }
} catch (e) {
  console.error('模块加载失败:', e);
  document.body.innerHTML = `<div style="padding:20px;color:red;font-family:sans-serif;"><h2>模块加载失败</h2><pre>${(e as Error).message}\n${(e as Error).stack}</pre></div>`;
}
