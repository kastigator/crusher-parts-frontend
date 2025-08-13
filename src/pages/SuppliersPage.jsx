// src/pages/SuppliersPage.jsx
import TabRendererPage from "@/components/common/TabRendererPage";
import SuppliersMain from "@/components/suppliers/SuppliersMain";

export default function SuppliersPage() {
  return (
    <TabRendererPage tabKey="suppliers">
      <SuppliersMain />
    </TabRendererPage>
  );
}
