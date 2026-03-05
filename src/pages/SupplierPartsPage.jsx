// src/pages/SupplierPartsPage.jsx
import TabRendererPage from "@/components/common/TabRendererPage";
import SupplierPartsMain from "@/components/supplierParts/SupplierPartsMain";

export default function SupplierPartsPage() {
  return (
    <TabRendererPage
      tabKey="supplier_parts"
      helpText="Двойной клик по строке — открыть карточку детали. Редактирование — через кнопку карандаша."
    >
      <SupplierPartsMain />
    </TabRendererPage>
  );
}
