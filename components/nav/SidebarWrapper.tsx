import { cn } from "@/lib/utils";
import { type ReactNode, useEffect, useState } from "react";
import { type NavItemType, Sidebar } from "./Sidebar";

export default function SidebarWrapper({
  children,
  defaultCollapsed = true,
  openMenus,
  onOpenMenusChange,
  isLoading,
  navItems,
  isDevTools = false,
  onShuffleNext,
  handleCollapse,
}: {
  children: ReactNode;
  defaultCollapsed?: boolean;
  openMenus: Record<string, boolean>;
  onOpenMenusChange: (newOpenMenus: Record<string, boolean>) => void;
  isLoading: boolean;
  navItems: NavItemType[];
  isDevTools?: boolean;
  onShuffleNext?: () => void;
  handleCollapse: () => void;
}): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    handleCollapse();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === "e") {
        event.preventDefault();
        toggleCollapse();
      }
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onShuffleNext?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleCollapse, onShuffleNext]);

  return (
    <div className="h-screen flex">
      <div
        className={cn(
          "flex-shrink-0 relative transition-all duration-200 ease-in-out",
          isCollapsed ? "w-14" : "w-[210px]",
          "hidden md:block"
        )}
      >
        <Sidebar
          isDevTools={isDevTools}
          items={navItems}
          isCollapsed={isCollapsed}
          isLoading={isLoading}
          toggleCollapse={toggleCollapse}
          openMenus={openMenus}
          onOpenMenusChange={onOpenMenusChange}
        />
      </div>
      <div className={cn("flex-grow overflow-hidden", "block")}>{children}</div>
    </div>
  );
}
