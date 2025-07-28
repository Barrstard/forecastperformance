"use client"

import type * as React from "react"
import { ChevronRight, MoreHorizontal } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  TrendingUp,
  Activity,
  Database,
  FileText,
  Settings,
  Users,
  Bell,
  HelpCircle,
  LogOut,
  User,
  Palette,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Navigation data structure
interface NavItem {
  title: string
  url: string
  icon?: any
  isActive?: boolean
  badge?: string
}

interface NavGroup {
  title: string
  url: string
  icon: any
  isActive?: boolean
  items?: NavItem[]
}

const data = {
  user: {
    name: "John Doe",
    email: "john.doe@company.com",
    avatar: "JD",
    role: "Data Scientist",
  },
  navMain: [
    {
      title: "Dashboards",
      url: "#",
      icon: BarChart3,
      isActive: true,
      items: [
        {
          title: "Executive Overview",
          url: "#",
          icon: TrendingUp,
          isActive: false,
        },
        {
          title: "Operational Control",
          url: "#",
          icon: Activity,
          isActive: true,
        },
        {
          title: "Analytics Workbench",
          url: "#",
          icon: BarChart3,
          isActive: false,
        },
      ],
    },
    {
      title: "Environments",
      url: "/environments",
      icon: Settings,
      items: [
        {
          title: "All Environments",
          url: "/environments",
        },
        {
          title: "Add New",
          url: "/environments/new",
        },
      ],
    },
    {
      title: "Forecast Models",
      url: "/forecast-models",
      icon: Database,
      items: [
        {
          title: "All Models",
          url: "/forecast-models",
        },
        {
          title: "Create New",
          url: "/forecast-models/new",
        },
        {
          title: "Active Comparisons",
          url: "/forecast-models?status=active",
        },
      ],
    },
    {
      title: "Reports",
      url: "#",
      icon: FileText,
      items: [
        {
          title: "Performance Reports",
          url: "#",
        },
        {
          title: "Accuracy Analysis",
          url: "#",
        },
        {
          title: "Model Comparison",
          url: "#",
        },
        {
          title: "Custom Reports",
          url: "#",
        },
      ],
    },
  ] as NavGroup[],
  navSecondary: [
    {
      title: "Team",
      url: "#",
      icon: Users,
    },
    {
      title: "Notifications",
      url: "#",
      icon: Bell,
      badge: "3",
    },
    {
      title: "Help & Support",
      url: "#",
      icon: HelpCircle,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onNavigate?: (view: string) => void
}

export function AppSidebar({ onNavigate, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#" className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <BarChart3 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ForecastPro</span>
                  <span className="truncate text-xs text-muted-foreground">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navMain.map((item) => (
              <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url} className="flex items-center">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                  {item.items?.length ? (
                    <>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuAction className="data-[state=open]:rotate-90">
                          <ChevronRight />
                          <span className="sr-only">Toggle</span>
                        </SidebarMenuAction>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subItem.isActive}
                                onClick={() => {
                                  if (subItem.title === "Executive Overview") {
                                    onNavigate?.("executive")
                                  } else if (subItem.title === "Operational Control") {
                                    onNavigate?.("operational")
                                  } else if (subItem.title === "Analytics Workbench") {
                                    onNavigate?.("analytics")
                                  }
                                }}
                              >
                                <a href={subItem.url} className="flex items-center justify-between w-full">
                                  <span>{subItem.title}</span>
                                  {subItem.badge && (
                                    <Badge
                                      variant="outline"
                                      className={`ml-auto text-xs ${
                                        subItem.badge === "Active"
                                          ? "bg-green-100 text-green-700 border-green-200"
                                          : subItem.badge === "Training"
                                            ? "bg-orange-100 text-orange-700 border-orange-200"
                                            : ""
                                      }`}
                                    >
                                      {subItem.badge}
                                    </Badge>
                                  )}
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </>
                  ) : null}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Secondary Navigation */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarMenu>
            {data.navSecondary.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <a href={item.url} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-700 border-blue-200">
                        {item.badge}
                      </Badge>
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                      {data.user.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{data.user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{data.user.role}</span>
                  </div>
                  <MoreHorizontal className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center">
                  <Palette className="mr-2 h-4 w-4" />
                  <span>Appearance</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center">
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
