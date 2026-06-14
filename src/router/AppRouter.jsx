// src/router/AppRouter.jsx
import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from '../auth/PrivateRoute'
import TabAccessRoute from '../auth/TabAccessRoute'
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
const MeasurementUnitsPage = lazy(() => import('@/pages/MeasurementUnitsPage'))
const LogisticsRouteTemplatesPage = lazy(() => import('@/pages/LogisticsRouteTemplatesPage'))
const KpiPage = lazy(() => import('@/pages/KpiPage'))
const StandardPartsPage = lazy(() => import('@/pages/StandardPartsPage'))
const EquipmentClassifierPage = lazy(() => import('@/pages/EquipmentClassifierPage'))
const ContractPreviewPage = lazy(() => import('@/pages/ContractPreviewPage'))
const PurchaseOrderPreviewPage = lazy(() => import('@/pages/PurchaseOrderPreviewPage'))
const TrashPage = lazy(() => import('@/pages/TrashPage'))

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
        <Route path="client-requests" element={<TabAccessRoute path="/client-request-workspace" title="Workspace по заявкам"><ClientRequestsPage /></TabAccessRoute>} />
        <Route path="client-request-workspace" element={<TabAccessRoute path="/client-request-workspace" title="Workspace по заявкам"><ClientRequestsPage /></TabAccessRoute>} />
        <Route path="rfq" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><RfqPage /></TabAccessRoute>} />
        <Route path="rfq-workspace" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><RfqWorkspacePage /></TabAccessRoute>} />
        <Route path="supplier-responses" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><SupplierResponsesPage /></TabAccessRoute>} />
        <Route path="coverage" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><CoveragePage /></TabAccessRoute>} />
        <Route path="scorecard" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><ScorecardPage /></TabAccessRoute>} />
        <Route path="economics" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><EconomicsPage /></TabAccessRoute>} />
        <Route path="selection" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><SelectionPage /></TabAccessRoute>} />
        <Route path="sales-quotes" element={<TabAccessRoute path="/client-request-workspace" title="Workspace по заявкам"><SalesQuotesPage /></TabAccessRoute>} />
        <Route path="contracts" element={<TabAccessRoute path="/client-request-workspace" title="Workspace по заявкам"><ContractsPage /></TabAccessRoute>} />
        <Route path="contracts/:id/preview" element={<TabAccessRoute path="/client-request-workspace" title="Workspace по заявкам"><ContractPreviewPage /></TabAccessRoute>} />
        <Route path="purchase-orders" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><PurchaseOrdersPage /></TabAccessRoute>} />
        <Route path="purchase-orders/:id/preview" element={<TabAccessRoute path="/rfq-workspace" title="RFQ Workspace"><PurchaseOrderPreviewPage /></TabAccessRoute>} />
        <Route path="kpi" element={<TabAccessRoute path="/kpi" title="Показатели"><KpiPage /></TabAccessRoute>} />
        <Route path="catalogs" element={<TabAccessRoute path="/catalogs" title="Каталоги"><CatalogsPage /></TabAccessRoute>} />
        <Route path="admin" element={<TabAccessRoute path="/admin" title="Администрирование"><AdminPage /></TabAccessRoute>} />
        <Route path="users" element={<UsersPage />} />
        <Route path="tnved-codes" element={<TabAccessRoute path="/tnved-codes" title="Коды ТН ВЭД"><TnvedCodesPage /></TabAccessRoute>} />
        <Route path="clients" element={<TabAccessRoute path="/clients" title="Клиенты"><ClientsPage /></TabAccessRoute>} />
        <Route path="clients/:id" element={<TabAccessRoute path="/clients" title="Клиенты"><ClientDetailPage /></TabAccessRoute>} />
        <Route path="suppliers" element={<TabAccessRoute path="/suppliers" title="Поставщики"><SuppliersPage /></TabAccessRoute>} />
        <Route path="suppliers/:id" element={<TabAccessRoute path="/suppliers" title="Поставщики"><SupplierDetailPage /></TabAccessRoute>} />
        <Route path="original-parts" element={<TabAccessRoute path="/original-parts" title="OEM детали"><OriginalPartsPage /></TabAccessRoute>} />
        <Route path="original-parts/:id" element={<TabAccessRoute path="/original-parts" title="OEM детали"><OriginalPartDetailPage /></TabAccessRoute>} />
        <Route path="supplier-parts" element={<TabAccessRoute path="/supplier-parts" title="Детали поставщиков"><SupplierPartsPage /></TabAccessRoute>} />
        <Route path="supplier-parts/:id" element={<TabAccessRoute path="/supplier-parts" title="Детали поставщиков"><SupplierPartDetailPage /></TabAccessRoute>} />
        <Route path="standard-parts" element={<TabAccessRoute path="/standard-parts" title="Стандартные детали"><StandardPartsPage /></TabAccessRoute>} />
        <Route path="equipment-classifier" element={<TabAccessRoute path="/equipment-classifier" title="Классификатор"><EquipmentClassifierPage /></TabAccessRoute>} />
        <Route path="materials" element={<TabAccessRoute path="/materials" title="Материалы"><MaterialsPage /></TabAccessRoute>} />
        <Route path="measurement-units" element={<TabAccessRoute path="/measurement-units" title="Единицы измерения"><MeasurementUnitsPage /></TabAccessRoute>} />
        <Route path="logistics-route-templates" element={<TabAccessRoute path="/logistics-route-templates" title="Шаблоны доставки"><LogisticsRouteTemplatesPage /></TabAccessRoute>} />
        <Route path="trash" element={<TabAccessRoute path="/catalogs" title="Корзина"><TrashPage /></TabAccessRoute>} />
        <Route path="*" element={<div style={{ padding: 32 }}>Страница не найдена</div>} />
      </Route>
    </Routes>
  </Suspense>
)

export default AppRouter
