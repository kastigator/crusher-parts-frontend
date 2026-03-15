// src/router/AppRouter.jsx
import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from '../auth/PrivateRoute'
import MainLayout from '../layout/MainLayout'

const LoginPage = lazy(() => import('../pages/LoginPage'))
const HomePage = lazy(() => import('../pages/HomePage'))
const UsersPage = lazy(() => import('../pages/UsersPage'))
const AdminPage = lazy(() => import('../pages/AdminPage'))
const CatalogsPage = lazy(() => import('../pages/CatalogsPage'))
const ClientRequestsPage = lazy(() => import('../pages/ClientRequestsPage'))
const RfqPage = lazy(() => import('../pages/RfqPage'))
const RfqWorkspacePage = lazy(() => import('../pages/RfqWorkspacePage'))
const SupplierResponsesPage = lazy(() => import('../pages/SupplierResponsesPage'))
const CoveragePage = lazy(() => import('../pages/CoveragePage'))
const ScorecardPage = lazy(() => import('../pages/ScorecardPage'))
const EconomicsPage = lazy(() => import('../pages/EconomicsPage'))
const SelectionPage = lazy(() => import('../pages/SelectionPage'))
const SalesQuotesPage = lazy(() => import('../pages/SalesQuotesPage'))
const ContractsPage = lazy(() => import('../pages/ContractsPage'))
const PurchaseOrdersPage = lazy(() => import('../pages/PurchaseOrdersPage'))
const TnvedCodesPage = lazy(() => import('../pages/TnvedCodesPage'))
const ClientsPage = lazy(() => import('../pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('../pages/ClientDetailPage'))
const SuppliersPage = lazy(() => import('../pages/SuppliersPage'))
const SupplierDetailPage = lazy(() => import('../pages/SupplierDetailPage'))
const OriginalPartsPage = lazy(() => import('../pages/OriginalPartsPage'))
const OriginalPartDetailPage = lazy(() => import('../pages/OriginalPartDetailPage'))
const SupplierPartsPage = lazy(() => import('@/pages/SupplierPartsPage'))
const SupplierPartDetailPage = lazy(() => import('@/pages/SupplierPartDetailPage'))
const MaterialsPage = lazy(() => import('@/pages/MaterialsPage'))
const LogisticsCorridorsPage = lazy(() => import('@/pages/LogisticsCorridorsPage'))
const StandardPartsPage = lazy(() => import('@/pages/StandardPartsPage'))
const EquipmentClassifierPage = lazy(() => import('@/pages/EquipmentClassifierPage'))

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
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="original-parts" element={<OriginalPartsPage />} />
        <Route path="original-parts/:id" element={<OriginalPartDetailPage />} />
        <Route path="supplier-parts" element={<SupplierPartsPage />} />
        <Route path="supplier-parts/:id" element={<SupplierPartDetailPage />} />
        <Route path="standard-parts" element={<StandardPartsPage />} />
        <Route path="equipment-classifier" element={<EquipmentClassifierPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="logistics-corridors" element={<LogisticsCorridorsPage />} />
        <Route path="*" element={<div style={{ padding: 32 }}>Страница не найдена</div>} />
      </Route>
    </Routes>
  </Suspense>
)

export default AppRouter
