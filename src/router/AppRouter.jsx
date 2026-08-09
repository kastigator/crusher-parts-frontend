// src/router/AppRouter.jsx
import React, { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import PrivateRoute from '../auth/PrivateRoute'
import TabAccessRoute from '../auth/TabAccessRoute'
import CapabilityAccessRoute from '../auth/CapabilityAccessRoute'
import MainLayout from '../layout/MainLayout'

const LoginPage = lazy(() => import('../pages/LoginPage'))
const HomePage = lazy(() => import('../pages/HomePage'))
const UsersPage = lazy(() => import('../pages/UsersPage'))
const AdminPage = lazy(() => import('../pages/AdminPage'))
const CatalogsPage = lazy(() => import('../pages/CatalogsPage'))
const ClientRequestsPage = lazy(() => import('../pages/ClientRequestsPage'))
const SourcingWorkspacePage = lazy(() => import('../pages/SourcingWorkspacePage'))
const PricingWorkspacePage = lazy(() => import('../pages/PricingWorkspacePage'))
const CommercialOfferWorkspacePage = lazy(() => import('../pages/CommercialOfferWorkspacePage'))
const ContractWorkspacePage = lazy(() => import('../pages/ContractWorkspacePage'))
const ProcurementExecutionWorkspacePage = lazy(() => import('../pages/ProcurementExecutionWorkspacePage'))
const FinancialOperationsWorkspacePage = lazy(() => import('../pages/FinancialOperationsWorkspacePage'))
const TnvedCodesPage = lazy(() => import('../pages/TnvedCodesPage'))
const ClientsPage = lazy(() => import('../pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('../pages/ClientDetailPage'))
const SuppliersPage = lazy(() => import('../pages/SuppliersPage'))
const SupplierDetailPage = lazy(() => import('../pages/SupplierDetailPage'))
const SupplierPartsPage = lazy(() => import('@/pages/SupplierPartsPage'))
const SupplierPartDetailPage = lazy(() => import('@/pages/SupplierPartDetailPage'))
const MaterialsPage = lazy(() => import('@/pages/MaterialsPage'))
const MeasurementUnitsPage = lazy(() => import('@/pages/MeasurementUnitsPage'))
const LogisticsRouteTemplatesPage = lazy(() => import('@/pages/LogisticsRouteTemplatesPage'))
const KpiPage = lazy(() => import('@/pages/KpiPage'))
const EquipmentClassifierPage = lazy(() => import('@/pages/EquipmentClassifierPage'))
const GlossaryPage = lazy(() => import('@/pages/GlossaryPage'))
const TrashPage = lazy(() => import('@/pages/TrashPage'))
const WarehouseInventoryWorkspacePage = lazy(() => import('@/pages/WarehouseInventoryWorkspacePage'))
const DispatchDeliveryWorkspacePage = lazy(() => import('@/pages/DispatchDeliveryWorkspacePage'))
const CompletionLifecycleWorkspacePage = lazy(() => import('@/pages/CompletionLifecycleWorkspacePage'))
const AfterSalesWorkspacePage = lazy(() => import('@/pages/AfterSalesWorkspacePage'))

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
        <Route path="client-requests" element={<CapabilityAccessRoute capability="client_requests.access" title="Заявки клиентов"><ClientRequestsPage /></CapabilityAccessRoute>} />
        <Route path="client-request-workspace" element={<CapabilityAccessRoute capability="client_requests.access" title="Заявки клиентов"><ClientRequestsPage /></CapabilityAccessRoute>} />
        <Route path="sourcing" element={<CapabilityAccessRoute capability="sourcing.access" title="Закупочная проработка"><SourcingWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="pricing" element={<CapabilityAccessRoute capability="pricing.access" title="Расчёт цены"><PricingWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="commercial-offers" element={<CapabilityAccessRoute capability="commercial_offers.access" title="Коммерческие предложения"><CommercialOfferWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="contracts" element={<CapabilityAccessRoute capability="contracts.access" title="Договоры"><ContractWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="purchase-orders" element={<CapabilityAccessRoute capability="procurement_execution.access" title="Исполнение закупки"><ProcurementExecutionWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="financial-operations" element={<CapabilityAccessRoute capability="financial_operations.access" title="Финансовые операции"><FinancialOperationsWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="warehouse" element={<CapabilityAccessRoute capability="warehouse_inventory.access" title="Склад"><WarehouseInventoryWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="dispatch-delivery" element={<CapabilityAccessRoute capability="dispatch_delivery.access" title="Отгрузка и доставка"><DispatchDeliveryWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="completion-lifecycle" element={<CapabilityAccessRoute capability="completion.access" title="Завершение заказа"><CompletionLifecycleWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="after-sales" element={<CapabilityAccessRoute capability="after_sales.access" title="Рекламации"><AfterSalesWorkspacePage /></CapabilityAccessRoute>} />
        <Route path="kpi" element={<TabAccessRoute path="/kpi" title="Показатели"><KpiPage /></TabAccessRoute>} />
        <Route path="catalogs" element={<TabAccessRoute path="/catalogs" title="Каталоги"><CatalogsPage /></TabAccessRoute>} />
        <Route path="admin" element={<CapabilityAccessRoute capability="administration.access" title="Администрирование"><AdminPage /></CapabilityAccessRoute>} />
        <Route path="users" element={<CapabilityAccessRoute capability="administration.access" title="Администрирование"><UsersPage /></CapabilityAccessRoute>} />
        <Route path="tnved-codes" element={<TabAccessRoute path="/tnved-codes" title="Коды ТН ВЭД"><TnvedCodesPage /></TabAccessRoute>} />
        <Route path="clients" element={<TabAccessRoute path="/clients" title="Клиенты"><ClientsPage /></TabAccessRoute>} />
        <Route path="clients/:id" element={<TabAccessRoute path="/clients" title="Клиенты"><ClientDetailPage /></TabAccessRoute>} />
        <Route path="suppliers" element={<TabAccessRoute path="/suppliers" title="Поставщики"><SuppliersPage /></TabAccessRoute>} />
        <Route path="suppliers/:id" element={<TabAccessRoute path="/suppliers" title="Поставщики"><SupplierDetailPage /></TabAccessRoute>} />
        <Route path="supplier-parts" element={<TabAccessRoute path="/supplier-parts" title="Детали поставщиков"><SupplierPartsPage /></TabAccessRoute>} />
        <Route path="supplier-parts/:id" element={<TabAccessRoute path="/supplier-parts" title="Детали поставщиков"><SupplierPartDetailPage /></TabAccessRoute>} />
        <Route path="equipment-classifier" element={<TabAccessRoute path="/equipment-classifier" title="Классификатор"><EquipmentClassifierPage /></TabAccessRoute>} />
        <Route path="glossary" element={<TabAccessRoute path="/catalogs" title="Глоссарий"><GlossaryPage /></TabAccessRoute>} />
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
