// src/pages/OriginalPartsPage.jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import TabRendererPage from "@/components/common/TabRendererPage";
import OriginalPartsMain from "@/components/originalParts/OriginalPartsMain";

export default function OriginalPartsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const focusParam = params.get("focus");
    const id = focusParam ? Number(focusParam) || null : null;
    if (id) {
      navigate(`/original-parts/${id}`, { replace: true });
    }
  }, [params, navigate]);

  return (
    <TabRendererPage
      tabKey="original_parts"
      helpText="OEM каталог с полным рабочим интерфейсом: список, импорт, BOM, материалы, документы, альтернативы и связи с поставщиками."
    >
      <OriginalPartsMain />
    </TabRendererPage>
  );
}
