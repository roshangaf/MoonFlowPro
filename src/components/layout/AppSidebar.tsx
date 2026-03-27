"use client"

import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BadgeDollarSign, 
  BellRing, 
  Settings,
  ArrowLeftRight,
  LogOut,
  UserCog
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard" },
  { title: "Inventory", icon: Package, url: "/inventory" },
  { title: "Customers", icon: Users, url: "/customers" },
  { title: "Sales", icon: BadgeDollarSign, url: "/sales" },
  { title: "AI Reminders", icon: BellRing, url: "/reminders" },
  { title: "Team", icon: UserCog, url: "/team" },
  { title: "Settings", icon: Settings, url: "/settings" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const auth = useAuth()
  const { user } = useUser()

  const handleLogout = async () => {
    if (!auth) return
    
    try {
      await signOut(auth)
      toast({
        title: "Logged Out",
        description: "You have been successfully signed out of MoonFlowPro.",
      })
      router.push("/")
    } catch (e) {
      console.error("Logout failed", e)
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-bold text-lg leading-tight tracking-tight">MoonFlow</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Business Pro</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Main Menu</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.url}
                  tooltip={item.title}
                >
                  <Link href={item.url} className="flex items-center gap-3 font-medium">
                    <item.icon className="h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout}
                tooltip="Log Out"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden font-medium">Log Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
