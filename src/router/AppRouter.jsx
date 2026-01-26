// src/router/AppRouter.jsx
import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from '../auth/PrivateRoute'
import LoginPage from '../pages/LoginPage'
import MainLayout from '../layout/MainLayout'
import HomePage from '../pages/HomePage'
import UsersPage from '../pages/UsersPage'
import AdminPage from '../pages/AdminPage'
import CatalogsPage from '../pages/CatalogsPage'
import ClientRequestsPage from '../pages/ClientRequestsPage'
import RfqPage from '../pages/RfqPage'
import RfqWorkspacePage from '../pages/RfqWorkspacePage'
import SupplierResponsesPage from '../pages/SupplierResponsesPage'
import CoveragePage from '../pages/CoveragePage'
import ScorecardPage from '../pages/ScorecardPage'
import EconomicsPage from '../pages/EconomicsPage'
import SelectionPage from '../pages/SelectionPage'
import SalesQuotesPage from '../pages/SalesQuotesPage'
import ContractsPage from '../pages/ContractsPage'
import PurchaseOrdersPage from '../pages/PurchaseOrdersPage'
import TnvedCodesPage from '../pages/TnvedCodesPage'
import ClientsPage from '../pages/ClientsPage'
import SuppliersPage from '../pages/SuppliersPage'
import OriginalPartsPage from '../pages/OriginalPartsPage'
import SupplierPartsPage from '@/pages/SupplierPartsPage'
import MaterialsPage from "@/pages/MaterialsPage"

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
        <Route path="client-requests" element={<ClientRequestsPage />} />
        <Route path="client-request-workspace" element={<ClientRequestsPage />} />
        <Route path="rfq" element={<RfqPage />} />
        <Route path="rfq-workspace" element={<RfqWorkspacePage />} />
        <Route path="supplier-responses" element={<SupplierResponsesPage />} />
        <Route path="coverage" element={<CoveragePage />} />
        <Route path="scorecard" element={<ScorecardPage />} />
        <Route path="economics" element={<EconomicsPage />} />
        <Route path="selection" element={<SelectionPage />} />
        <Route path="sales-quotes" element={<SalesQuotesPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="catalogs" element={<CatalogsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="tnved-codes" element={<TnvedCodesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="original-parts" element={<OriginalPartsPage />} />
        <Route path="supplier-parts" element={<SupplierPartsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="*" element={<div style={{ padding: 32 }}>Страница не найдена</div>} />
      </Route>
    </Routes>
  </Suspense>
)

export default AppRouter
