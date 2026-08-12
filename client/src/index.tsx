import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage/HomePage';

console.log('=== 测试 HomePage ===');

const TestApp = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background p-4">
        <h2 className="text-xl font-bold mb-4 text-foreground">下面是 HomePage 内容：</h2>
        <HomePage />
      </div>
    </BrowserRouter>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TestApp />);
  console.log('HomePage 测试页面渲染完成');
}
