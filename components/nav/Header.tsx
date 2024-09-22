import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Menu, X, Shield, UserCog } from "lucide-react"

export function Header() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <header className="w-full bg-neutral-100">
      <div className="flex justify-end items-center px-4 py-3">
        <div className="flex items-center space-x-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="text-base flex items-center space-x-2 px-3 py-2 text-blue-500
                           hover:bg-blue-100 hover:text-blue-600 
                           transition-all duration-200 ease-in-out 
                           rounded-md
                           hover:shadow-md hover:scale-105 
                           active:scale-100 active:shadow-sm"
              >
                <Settings className="h-6 w-6" />
                <span className="font-medium">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              <DropdownMenuItem 
                onClick={() => router.push("/compliance")}
                className="flex items-center p-3 space-x-3 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Compliance</p>
                  <p className="text-sm text-gray-500">Manage compliance settings</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => router.push("/configuration")}
                className="flex items-center p-3 space-x-3 hover:bg-blue-50 rounded-md transition-colors"
              >
                <UserCog className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Account Settings</p>
                  <p className="text-sm text-gray-500">Manage your account</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={toggleMenu} className="md:hidden">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </header>
  )
}