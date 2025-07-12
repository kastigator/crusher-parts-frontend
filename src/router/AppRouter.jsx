import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from '../auth/PrivateRoute'
import LoginPage from '../pages/LoginPage'
import MainLayout from '../layout/MainLayout'
import TabRendererPage from '../pages/TabRendererPage'
import HomePage from '../pages/HomePage' // 👈 добавляем импорт

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
        <Route index element={<HomePage />} />           {/* 👈 новый index */}
        <Route path="*" element={<TabRendererPage />} />
      </Route>
    </Routes>
  </Suspense>
)

export default AppRouter
