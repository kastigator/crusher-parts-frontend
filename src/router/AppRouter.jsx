// src/router/AppRouter.jsx
import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from '../auth/PrivateRoute'
import LoginPage from '../pages/LoginPage'
import MainLayout from '../layout/MainLayout'
import HomePage from '../pages/HomePage'
import UsersPage from '../pages/UsersPage'
import TnvedCodesPage from '../pages/TnvedCodesPage'
import ClientsPage from '../pages/ClientsPage'
import SuppliersPage from '../pages/SuppliersPage'
import OriginalPartsPage from '../pages/OriginalPartsPage'
import SupplierPartsPage from '@/pages/SupplierPartsPage'
import ClientOrdersPage from '../pages/ClientOrdersPage'   // 🔹 добавили

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
        <Route path="clients" element={<ClientsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="original-parts" element={<OriginalPartsPage />} />
        <Route path="/supplier-parts" element={<SupplierPartsPage />} />
        <Route path="client-orders" element={<ClientOrdersPage />} />  {/* 🔹 новый роут */}
        <Route path="*" element={<div style={{ padding: 32 }}>Страница не найдена</div>} />
      </Route>
    </Routes>
  </Suspense>
)

export default AppRouter
