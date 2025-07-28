"use client"

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { useEnvironmentStore } from '@/stores/environment-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Settings, Plus, Sun, Moon } from 'lucide-react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useTheme } from 'next-themes'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  
  const { currentEnvironment, environments, setCurrentEnvironment } = useEnvironmentStore()

  // Prevent hydration mismatch
  useEffect(() => {
    console.log('MainLayout: Setting mounted to true')
    setMounted(true)
  }, [])

  // Add error boundary
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('MainLayout: Caught error:', error)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  const handleNavigate = (view: string) => {
    switch (view) {
      case 'executive':
        router.push('/dashboard/executive')
        break
      case 'operational':
        router.push('/dashboard/operational')
        break
      case 'analytics':
        router.push('/dashboard/analytics')
        break
      default:
        router.push('/dashboard')
    }
  }

  const handleEnvironmentChange = (environmentId: string) => {
    setCurrentEnvironment(environmentId)
  }

  // Temporarily disable mounting check to debug
  // if (!mounted) {
  //   console.log('MainLayout: Rendering loading state, mounted:', mounted)
  //   return (
  //     <div className="flex h-screen bg-background w-screen items-center justify-center">
  //       <div className="text-lg font-semibold">Loading...</div>
  //     </div>
  //   )
  // }

  console.log('MainLayout: Rendering full layout, mounted:', mounted)
  return (
    <SidebarProvider defaultOpen={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-screen w-screen relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        
        <AppSidebar 
          onNavigate={handleNavigate}
          className="relative z-10 border-r border-white/20 backdrop-blur-sm bg-white/10 dark:bg-black/10"
        />
        
        <div className="flex flex-1 flex-col overflow-hidden w-full min-w-0 max-w-none relative z-10">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 w-full glass-card dark:glass-card-dark border-b border-white/20 backdrop-blur-md">
            <div className="flex items-center gap-4 flex-1">
              <h1 className="text-lg font-semibold">
                {pathname === '/dashboard' && 'Dashboard'}
                {pathname.includes('/batch-jobs') && 'Batch Jobs'}
                {pathname.includes('/environments') && 'Environment Management'}
                {pathname.includes('/forecast-models') && 'Forecast Models'}
                {pathname.includes('/forecasts') && 'Forecast Management'}
                {pathname.includes('/settings') && 'Settings'}
                {!pathname.includes('/dashboard') && !pathname.includes('/environments') && 
                 !pathname.includes('/forecast-models') && !pathname.includes('/forecasts') && 
                 !pathname.includes('/batch-jobs') && !pathname.includes('/settings') && 'Dashboard'}
              </h1>
            </div>

            {/* Environment Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Environment:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[200px] justify-between glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass">
                    <span className="truncate">
                      {currentEnvironment?.name || 'Select Environment'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {environments.map((env) => (
                    <DropdownMenuItem
                      key={env.id}
                      onClick={() => handleEnvironmentChange(env.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{env.name}</span>
                      {env.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    onClick={() => router.push('/environments/new')}
                    className="text-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Environment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/forecast-models/new')}
                className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Model
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings')}
                className="glass-input dark:glass-input-dark hover-glass dark:hover-glass-dark transition-glass"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto w-full max-w-none p-6">
            <div className="space-glass">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
} 