import { Card } from "@/components/ui/card"
import SidebarWrapper from "./SidebarWrapper"
import { type NavItemType } from "./Sidebar"
import { LayoutDashboard, TextSelect } from "lucide-react"
import { Header } from "./Header"
import { useState, useEffect, useCallback } from "react"

const navItems: NavItemType[] = [
  {
    icon: <TextSelect className="w-6 h-6 text-blue-500" />,
    label: "Generate",
    href: "/",
  },
  {
    icon: <LayoutDashboard className="w-6 h-6 text-blue-500" />,
    label: "Compliance",
    href: "/compliance",
  },
]

export default function Navbar({
  children,
  onShuffleNext,
}: {
  children: React.ReactNode
  onShuffleNext?: () => void
}): React.ReactNode | null {
  const [defaultCollapsed, setDefaultCollapsed] = useState<boolean | undefined>(undefined);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const handleCollapse = useCallback(() => {
    setDefaultCollapsed((prev) => !prev);
    localStorage.setItem("sidebar-collapsed", (!defaultCollapsed).toString());
  }, [defaultCollapsed]);

  useEffect(() => {
    const collapsed = localStorage.getItem("sidebar-collapsed");
    const storedOpenMenus = localStorage.getItem("open-menus-real");

    setDefaultCollapsed(collapsed ? JSON.parse(collapsed) : undefined);
    setOpenMenus(storedOpenMenus ? JSON.parse(storedOpenMenus) : {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key === "e") {
        event.preventDefault()
        handleCollapse()
      }
      if (event.key === 'j' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onShuffleNext?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleCollapse, onShuffleNext])

  const handleOpenMenusChange = (newOpenMenus: Record<string, boolean>) => {
    setOpenMenus(newOpenMenus);
    localStorage.setItem("open-menus-real", JSON.stringify(newOpenMenus));
  };

  return (
    <div className="bg-neutral-100 antialiased relative overflow-hidden">
      <SidebarWrapper
        defaultCollapsed={defaultCollapsed}
        openMenus={openMenus}
        onOpenMenusChange={handleOpenMenusChange}
        isLoading={false}
        navItems={navItems}
        onShuffleNext={onShuffleNext}
        handleCollapse={handleCollapse} // Pass handleCollapse to SidebarWrapper
      >
        <Header/>

        <main className="pb-4 px-4">
          <Card className="flex flex-col bg-background shadow p-0 overflow-hidden h-[calc(100vh-135px)] md:h-[calc(100vh-70px)] xs:h-[70svh]">
            <div className="flex-grow bg-gray-100 lg:p-14 overflow-y-scroll">
              {children}
            </div>
          </Card>
        </main>
      </SidebarWrapper>
    </div>
  )
}