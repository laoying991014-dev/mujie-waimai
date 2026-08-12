import React from 'react';
import { createRoot } from 'react-dom/client';

console.log('=== 测试 Tailwind 样式 ===');

const TestApp = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-primary mb-4">木姐外卖</h1>
      <p className="text-foreground text-lg mb-2">Tailwind 样式测试</p>
      <p className="text-muted-foreground">如果能看到这些文字，说明 Tailwind 正常工作。</p>
      <div className="mt-6 p-4 bg-card rounded-lg shadow border border-border">
        <p className="text-card-foreground">这是一个卡片组件</p>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<TestApp />);
  console.log('测试页面渲染完成');
}
