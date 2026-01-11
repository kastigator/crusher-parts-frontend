// src/pages/OriginalPartsPage.jsx
import TabRendererPage from "@/components/common/TabRendererPage";
import OriginalPartsMain from "@/components/originalParts/OriginalPartsMain";

export default function OriginalPartsPage() {
  return (
    <TabRendererPage
      tabKey="original-parts"
      helpText="Кнопка карандаш — редактирование; Enter — сохранить; Esc — отменить."
    >
      <OriginalPartsMain />
    </TabRendererPage>
  );
}
