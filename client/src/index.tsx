import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import UserLayout from './components/user-layout';

console.log('=== 测试 UserLayout ===');

const TestApp = () => {
  return (
    <BrowserRouter>
      <UserLayout />
    </BrowserRouter>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TestApp />);
  console.log('UserLayout 测试页面渲染完成');
}
