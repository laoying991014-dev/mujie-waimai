import React from 'react';
import { createRoot } from 'react-dom/client';

// 最简单的测试：先确认 React 能正常渲染
const TestApp = () => {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#ff6b35' }}>木姐外卖</h1>
      <p>React 渲染成功！</p>
      <p>如果能看到这段文字，说明 React 工作正常。</p>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TestApp />);
} else {
  document.body.innerHTML = '<div style="padding:20px;color:red;">错误：找不到 root 元素</div>';
}
