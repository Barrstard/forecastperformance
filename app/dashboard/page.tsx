"use client"

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MainLayout } from '@/components/layout/main-layout'
import { useEnvironmentStore } from '@/stores/environment-store'
import { useForecastStore } from '@/stores/forecast-store'
import { 
  TrendingUp, 
  Activity, 
  BarChart3, 
  Database, 
  FileText, 
  Settings,
  ArrowRight,
  Plus
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { currentEnvironment, environments } = useEnvironmentStore()
  const { activeRuns, completedRuns, failedRuns } = useForecastStore()

  const dashboardOptions = [
    {
      title: 'Executive Dashboard',
      description: 'High-level KPIs and strategic insights',
      icon: TrendingUp,
      href: '/dashboard/executive',
      color: 'bg-gradient-to-r from-blue-500 to-purple-600',
      stats: {
        totalRuns: completedRuns.length,
        avgAccuracy: '87.3%',
        trend: '+2.1%'
      }
    },
    {
      title: 'Operational Dashboard',
      description: 'Real-time monitoring and job status',
      icon: Activity,
      href: '/dashboard/operational',
      color: 'bg-gradient-to-r from-green-500 to-emerald-600',
      stats: {
        activeJobs: activeRuns.length,
        systemHealth: 'Healthy',
        uptime: '99.8%'
      }
    },
    {
      title: 'Analytics Dashboard',
      description: 'Deep-dive analysis and model comparison',
      icon: BarChart3,
      href: '/dashboard/analytics',
      color: 'bg-gradient-to-r from-orange-500 to-red-600',
      stats: {
        models: 5,
        comparisons: 12,
        insights: 8
      }
    }
  ]

  const quickActions = [
    {
      title: 'New Forecast Run',
      description: 'Create a new forecast execution',
      icon: Plus,
      href: '/forecasts/new',
      color: 'bg-blue-500'
    },
    {
      title: 'Environment Setup',
      description: 'Configure BigQuery and Dimensions connections',
      icon: Database,
      href: '/environments/new',
      color: 'bg-green-500'
    },
    {
      title: 'Model Management',
      description: 'Manage forecast models and configurations',
      icon: FileText,
      href: '/models',
      color: 'bg-purple-500'
    },
    {
      title: 'Settings',
      description: 'Application configuration and preferences',
      icon: Settings,
      href: '/settings',
      color: 'bg-gray-500'
    }
  ]

  return (
    <MainLayout>
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to the Sales Forecast Comparison Platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentEnvironment && (
              <Badge variant="secondary">
                Environment: {currentEnvironment.name}
              </Badge>
            )}
            {!currentEnvironment && (
              <Badge variant="destructive">
                No Environment Selected
              </Badge>
            )}
          </div>
        </div>

        {/* Environment Warning */}
        {!currentEnvironment && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <Database className="h-4 w-4" />
                <span className="font-medium">No Environment Configured</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Please configure an environment with BigQuery credentials to start using the application.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => router.push('/environments/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Environment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Options */}
        <div className="grid gap-6 md:grid-cols-3">
          {dashboardOptions.map((option) => (
            <Card 
              key={option.title} 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
              onClick={() => router.push(option.href)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${option.color}`}>
                    <option.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(option.stats).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="font-medium">{value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => router.push(action.href)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeRuns.length}</div>
                <p className="text-sm text-muted-foreground">
                  Currently running forecast jobs
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completed Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedRuns.length}</div>
                <p className="text-sm text-muted-foreground">
                  Successfully completed forecasts
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Failed Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{failedRuns.length}</div>
                <p className="text-sm text-muted-foreground">
                  Failed forecast executions
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 