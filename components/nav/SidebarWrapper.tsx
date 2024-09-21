import { cn } from "@/lib/utils"
import { type ReactNode, useCallback, useEffect, useState } from "react"
import { type NavItemType, Sidebar } from "./Sidebar"

export default function SidebarWrapper({
  children,
  defaultCollapsed = true,
  openMenus,
  onOpenMenusChange,
  isLoading,
  navItems,
  isDevTools = false,
}: {
  children: ReactNode
  defaultCollapsed?: boolean
  openMenus: Record<string, boolean>
  onOpenMenusChange: (newOpenMenus: Record<string, boolean>) => void
  isLoading: boolean
  navItems: NavItemType[]
  isDevTools?: boolean
}): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const handleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev)
    localStorage.setItem("sidebar-collapsed", (!isCollapsed).toString())
  }, [isCollapsed])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === "e") {
        event.preventDefault()
        handleCollapse()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleCollapse])

  return (
    <div className="h-screen flex">
      <div
        className={cn(
          "flex-shrink-0 relative transition-all duration-200 ease-in-out",
          isCollapsed ? "w-14" : "w-[210px]",
          "hidden md:block",
        )}
      >
        <Sidebar
          isDevTools={isDevTools}
          items={navItems}
          isCollapsed={isCollapsed}
          isLoading={isLoading}
          toggleCollapse={handleCollapse}
          openMenus={openMenus}
          onOpenMenusChange={onOpenMenusChange}
        />
      </div>
      <div className={cn("flex-grow overflow-hidden", "block")}>{children}</div>
    </div>
  )
}
