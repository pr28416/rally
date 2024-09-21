import Link from "next/link"
import { ChevronDownIcon, ChevronLeftIcon } from "@heroicons/react/20/solid"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CommandIcon, MessageSquareDot, XIcon } from "lucide-react"
import { type ReactNode } from "react"
import { z } from "zod"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

const PageEnum = {
  Home: "Home",
  Search: "Search",
  Data: "Data",
  Create: "Create",
  Ideation: "Ideation",
  Generate: "Generate",
  Testing: "Testing",
  Deploy: "Deploy",
}

export const pageValidator = z.nativeEnum(PageEnum)

export type NavItemType = {
  icon: React.ReactNode
  label: (typeof PageEnum)[keyof typeof PageEnum]
  href?: string
  subItems?: SubItem[]
  newTab?: boolean
  beta?: boolean
}

export type SubItem = {
  icon: React.ReactNode
  label: string
  href?: string
  newTab?: boolean
  beta?: boolean
  subItems?: SubItem[]
}

export function Sidebar({
  items,
  isLoading = false,
  isCollapsed = false,
  openMenus,
  onOpenMenusChange,
  toggleCollapse,
}: {
  items: NavItemType[]
  isLoading: boolean
  isCollapsed: boolean
  isDevTools: boolean
  toggleCollapse: () => void
  openMenus: Record<string, boolean>
  onOpenMenusChange: (newOpenMenus: Record<string, boolean>) => void
}): React.ReactNode {
  const router = useRouter()

  const toggleMenu = (label: string): void => {
    const newOpenMenus = {
      ...openMenus,
      [label]: !openMenus[label],
    }
    onOpenMenusChange(newOpenMenus)
  }

  return (
    <>
      <nav
        className={cn(
          "flex flex-col gap-8 h-full bg-neutral-100 overflow-hidden pt-4 pl-2 pr-0 relative max-h-screen items-center",
        )}
        onClick={() => {
          toggleCollapse()
        }}
      >
        <div
          className={cn(
            "items-center h-10",
            isCollapsed ? "w-[30px]" : "w-[200px] ml-3",
          )}
        >
            <div className={cn("flex items-center cursor-pointer", !isCollapsed ? "ml-3" : "")} onClick={() => router.push("/")}>
                <MessageSquareDot className="w-6 h-6 text-blue-500 font-light" />
                {!isCollapsed && <h2 className="ml-2 mb-1 text-2xl font-light text-blue-500">rally</h2>}
        </div>
        </div>
        <div className="w-full overflow-y-auto overflow-x-hidden pb-20">
          <ul
            className="group space-y-1 pb-5"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {items.map((item) => (
              <NavItem
                key={item.label}
                isLoading={isLoading}
                item={item}
                toggleMenu={toggleMenu}
                openMenus={openMenus}
                isCollapsed={isCollapsed}
              />
            ))}
          </ul>
        </div>
        <div className="absolute right-6 top-6 md:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <XIcon />
          </Button>
        </div>
      </nav>
      <div className="absolute right-0 top-1/2 transform translate-x-[120%] -translate-y-1/2">
        <CollapseButton
          toggleCollapse={toggleCollapse}
          isCollapsed={isCollapsed}
        />
      </div>
    </>
  )
}

const NavItem = ({
  isLoading,
  item,
  toggleMenu,
  openMenus,
  isCollapsed,
}: {
  isLoading: boolean
  item: NavItemType
  toggleMenu: (label: z.infer<typeof pageValidator>) => void
  openMenus: Record<z.infer<typeof pageValidator>, boolean>
  isCollapsed: boolean
}): ReactNode => {
  return (
    <Skeleton isLoading={isLoading} className="bg-neutral-200" key={item.label}>
      <div className={cn(isCollapsed && "flex flex-col items-center")}>
        <NavButton
          item={item}
          toggleMenu={toggleMenu}
          openMenus={openMenus}
          isCollapsed={isCollapsed}
          topLevel={true}
        />
        {item.subItems && (
          <ul
            className={cn(
              "mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
              isCollapsed
                ? "flex flex-col justify-center items-center"
                : "ml-4",
              openMenus[item.label] ? "max-h-96 pb-2" : "max-h-0",
            )}
          >
            {item.subItems.map((subItem) => (
              <Skeleton
                isLoading={isLoading}
                className="bg-neutral-200"
                key={subItem.label}
              >
                <NavButton item={subItem} isCollapsed={isCollapsed} topLevel={false}/>
              </Skeleton>
            ))}
          </ul>
        )}
      </div>
    </Skeleton>
  )
}

const NavButton = ({
  item,
  toggleMenu,
  openMenus,
  isCollapsed,
  topLevel,
}: {
  item: NavItemType | SubItem
  toggleMenu?: (label: z.infer<typeof pageValidator>) => void
  openMenus?: Record<z.infer<typeof pageValidator>, boolean>
  isCollapsed: boolean
  topLevel: boolean
}): ReactNode => {
  const pathname = usePathname()
  const isParent = "subItems" in item
  const href = "href" in item ? item.href : undefined

  const content = (
        <li
          className={cn(
            "rounded-lg flex items-center gap-2 hover:bg-white hover:shadow-md select-none relative p-2 h-10",
            isCollapsed ? "w-10 justify-center" : "w-full",
            isParent && "cursor-pointer",
            href === pathname &&
              "bg-white shadow-md group-hover:bg-transparent group-hover:shadow-none",
          )}
          onClick={(e) => {
            if (href) {
              return
            }
    
            if (isParent && item.subItems && toggleMenu) {
              const page = pageValidator.parse(item.label)
              toggleMenu(page)
            }
    
            e.stopPropagation()
          }}
        >
          <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
            {item.icon}
          </div>
          {!isCollapsed && (
                <span className={`text-md ${topLevel ? "font-semibold text-blue-500" : "font-medium text-gray-700"} `}>{item.label}</span>
            )}
          {!isCollapsed && isParent && item.subItems && (
            <ChevronDownIcon
              className={cn(
                "w-4 h-4 flex-shrink-0 transition-transform duration-300 ease-in-out text-black",
                openMenus?.[item.label] && "rotate-180",
              )}
            />
          )}
          {isCollapsed && isParent && item.subItems && (
            <ChevronDownIcon
              className={cn(
                "absolute bottom-0 w-3 h-3 transition-all duration-300 ease-in-out text-black",
                openMenus?.[item.label] && "rotate-180",
              )}
            />
          )}
        </li>
  )

  const wrappedContent = href ? (
    <Link
      href={href}
      draggable={false}
      target={item.newTab ? "_blank" : undefined}
      rel={item.newTab ? "noopener noreferrer" : undefined}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      {content}
    </Link>
  ) : (
    content
  )

  if (isCollapsed) {
    return (
      <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger>{wrappedContent}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
      </TooltipProvider>
    )
  }

  return wrappedContent
}

const CollapseButton = ({
  toggleCollapse,
  isCollapsed,
}: {
  toggleCollapse: () => void
  isCollapsed: boolean
}): ReactNode => {
  return (
    <div className="hidden md:flex items-center justify-center">
      <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              toggleCollapse()
            }}
            variant="outline"
            className="w-6 h-6 rounded-full p-0 flex items-center justify-center bg-neutral-100 shadow-md"
          >
            <ChevronLeftIcon
              className={cn(
                "w-4 h-4 transition-transform text-neutral-500",
                isCollapsed ? "rotate-180" : "",
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="flex items-center space-x-2">
            <span>{isCollapsed ? "Expand" : "Collapse"} sidebar</span>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <CommandIcon className="w-3 h-3" />
              <span>E</span>
            </div>
          </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
