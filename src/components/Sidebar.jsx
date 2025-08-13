import React from "react";
import { Tooltip } from "antd";
import * as AntIcons from "@ant-design/icons";
import {
  FaIndustry,
  FaCogs,
  FaTools,
  FaWarehouse,
  FaWrench,
  FaTruck,
  FaTruckMoving,
  FaHammer,
  FaHardHat,
  FaRobot,
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useTabs } from "@/context/TabsContext";

// Набор тех‑иконок (react-icons/fa)
const techIcons = {
  FaIndustry,
  FaCogs,
  FaTools,
  FaWarehouse,
  FaWrench,
  FaTruck,
  FaTruckMoving,
  FaHammer,
  FaHardHat,
  FaRobot,
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tabs = [], permissions = [], loading } = useTabs();

  const visibleTabs = tabs
    .filter((tab) => permissions.includes(tab.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  const ICON_SIZE = 28; // 👈 размер иконок (поменяешь тут — обновится везде)

  // Безопасный рендер иконки по имени из БД (поддерживает AntD и react-icons)
  const renderIcon = (iconNameRaw) => {
    const name = (iconNameRaw || "").trim();
    if (name && AntIcons[name]) {
      const C = AntIcons[name];
      return <C style={{ fontSize: ICON_SIZE }} />;
    }
    if (name && techIcons[name]) {
      const C = techIcons[name];
      return <C size={ICON_SIZE} />;
    }
    const Q = AntIcons.QuestionOutlined;
    return <Q style={{ fontSize: ICON_SIZE }} />;
  };

  return (
    <div
      style={{
        width: 72,
        minWidth: 72,
        flexShrink: 0,
        height: "100%",
        backgroundColor: "#f7f7f7",
        borderRight: "1px solid #e5e5e5",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        paddingTop: 6,
      }}
    >
      {loading ? (
        <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", paddingTop: 12 }}>
          Загрузка…
        </div>
      ) : visibleTabs.length === 0 ? (
        <Tooltip title="Нет доступных вкладок" placement="right">
          <div style={{ fontSize: 10, color: "#999", textAlign: "center", padding: 8 }}>
            Нет вкладок
          </div>
        </Tooltip>
      ) : (
        visibleTabs.map((tab) => {
          const selected =
            location.pathname === tab.path || location.pathname === `/${tab.path}`;
          return (
            <Tooltip
              key={tab.id}
              title={tab.name || "Вкладка"}
              placement="right"
              mouseEnterDelay={0.2}
            >
              <div
                onClick={() =>
                  navigate(tab.path?.startsWith("/") ? tab.path : `/${tab.path}`)
                }
                style={{
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  cursor: "pointer",
                  color: selected ? "#2563eb" : "#444",
                  background: selected ? "#eef2ff" : "transparent",
                  transition: "background 0.15s ease, color 0.15s ease, transform 0.05s ease-in-out",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                {/* активная полоса слева */}
                {selected && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      background: "#2563eb",
                      borderRadius: 2,
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    transition: "background 0.15s ease",
                  }}
                >
                  {renderIcon(tab.icon)}
                </div>
              </div>
            </Tooltip>
          );
        })
      )}
    </div>
  );
};

export default Sidebar;
