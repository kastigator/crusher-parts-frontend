import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from '../auth/PrivateRoute'
import LoginPage from '../pages/LoginPage'
import MainLayout from '../layout/MainLayout'
import HomePage from '../pages/HomePage'
import UsersPage from '../pages/UsersPage'
import TnvedCodesPage from '../pages/TnvedCodesPage'


const AppRouter = () => (
  <Suspense fallback={<div>Загрузка...</div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="tnved-codes" element={<TnvedCodesPage />} />

        {/* Здесь будут добавляться другие страницы вручную */}
        <Route path="*" element={<div style={{ padding: 32 }}>Страница не найдена</div>} />
      </Route>
    </Routes>
  </Suspense>
)

export default AppRouter
