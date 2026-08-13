import React from 'react';
import { Route, Routes } from 'react-router-dom';
import './api/axios';
import UserLayout from './components/user-layout';
import HomePage from './pages/HomePage/HomePage';

console.log('app.tsx 模块加载成功');

const RoutesComponent = () => {
  console.log('RoutesComponent 开始渲染');
  return (
    <div>
      <div style={{ padding: '10px', background: 'yellow', color: 'black' }}>
        调试：RoutesComponent 已渲染
      </div>
      <Routes>
        <Route element={<UserLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
    </div>
  );
};

export default RoutesComponent;
