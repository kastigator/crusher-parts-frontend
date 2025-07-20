// src/pages/ClientsPage.jsx
import TabRendererPage from "@/components/common/TabRendererPage";
import ClientsMain from "@/components/clients/ClientsMain";

export default function ClientsPage() {
  return (
    <TabRendererPage tabKey="clients">
      <ClientsMain />
    </TabRendererPage>
  );
}
