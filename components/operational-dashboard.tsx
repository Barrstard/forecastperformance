"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Filter, Download, Bell, Search } from "lucide-react"

// Same distribution data
const distributionData = [
  { bracket: "55-65%", count2024: 12, count2025: 8, range: "55% to 65%" },
  { bracket: "65-75%", count2024: 45, count2025: 32, range: "65% to 75%" },
  { bracket: "75-85%", count2024: 123, count2025: 98, range: "75% to 85%" },
  { bracket: "85-95%", count2024: 287, count2025: 312, range: "85% to 95%" },
  { bracket: "95-105%", count2024: 342, count2025: 398, range: "95% to 105%" },
  { bracket: "105-115%", count2024: 298, count2025: 276, range: "105% to 115%" },
  { bracket: "115-125%", count2024: 156, count2025: 142, range: "115% to 125%" },
  { bracket: "125-135%", count2024: 67, count2025: 54, range: "125% to 135%" },
  { bracket: "135-145%", count2024: 23, count2025: 18, range: "135% to 145%" },
]

const activeJobs = [
  { model: "Sales V2.1", progress: 67, status: "running", color: "bg-blue-100 text-blue-700" },
  { model: "Seasonal", progress: 23, status: "running", color: "bg-purple-100 text-purple-700" },
  { model: "Holiday", progress: 91, status: "running", color: "bg-emerald-100 text-emerald-700" },
]

const recentAlerts = [
  {
    type: "warning",
    message: "Store #045 accuracy drop",
    time: "5m ago",
    icon: AlertTriangle,
    color: "text-orange-600",
  },
  {
    type: "success",
    message: "Holiday model completed",
    time: "12m ago",
    icon: CheckCircle,
    color: "text-emerald-600",
  },
  { type: "info", message: "Weekly retrain initiated", time: "1h ago", icon: RefreshCw, color: "text-blue-600" },
  { type: "warning", message: "High variance detected", time: "2h ago", icon: AlertTriangle, color: "text-orange-600" },
]

export default function OperationalDashboard() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Dashboards</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Operational Control</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">Accuracy</div>
              <div className="text-2xl font-bold text-gray-900">92.4%</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">MAE</div>
              <div className="text-2xl font-bold text-gray-900">1.24</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">MAPE</div>
              <div className="text-2xl font-bold text-gray-900">3.67%</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">RMSE</div>
              <div className="text-2xl font-bold text-gray-900">2.89</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-600">Uptime</div>
              <div className="text-2xl font-bold text-emerald-600">99.7%</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <Tabs defaultValue="distribution" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-fit grid-cols-4 bg-gray-100">
                  <TabsTrigger value="distribution" className="data-[state=active]:bg-white">
                    Distribution
                  </TabsTrigger>
                  <TabsTrigger value="timeseries" className="data-[state=active]:bg-white">
                    Time Series
                  </TabsTrigger>
                  <TabsTrigger value="heatmap" className="data-[state=active]:bg-white">
                    Heatmap
                  </TabsTrigger>
                  <TabsTrigger value="models" className="data-[state=active]:bg-white">
                    Models
                  </TabsTrigger>
                </TabsList>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <TabsContent value="distribution" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Accuracy Distribution Analysis</h3>
                    <p className="text-sm text-gray-600">Real-time view of forecast accuracy across all stores</p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Model:</span>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Models</SelectItem>
                          <SelectItem value="sales">Sales V2.1</SelectItem>
                          <SelectItem value="seasonal">Seasonal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Department:</span>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="clothing">Clothing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Time:</span>
                      <Select defaultValue="7days">
                        <SelectTrigger className="w-32 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7days">Last 7 Days</SelectItem>
                          <SelectItem value="30days">Last 30 Days</SelectItem>
                          <SelectItem value="quarter">Quarter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="bracket" stroke="#6B7280" fontSize={12} />
                        <YAxis stroke="#6B7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #E5E7EB",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="count2024" fill="#93C5FD" name="2024" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="count2025" fill="#3B82F6" name="2025" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeseries" className="mt-6">
                <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium">Time Series Analysis</p>
                    <p className="text-sm">Coming soon - Historical trend analysis</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="heatmap" className="mt-6">
                <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Heatmap View</p>
                    <p className="text-sm">Coming soon - Geographic performance mapping</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="models" className="mt-6">
                <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-blue-500 rounded mx-auto mb-4"></div>
                    <p className="text-lg font-medium">Model Comparison</p>
                    <p className="text-sm">Coming soon - Detailed model analytics</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Jobs */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-blue-500" />
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeJobs.map((job, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-gray-900">{job.model}</span>
                    <Badge className={job.color}>Running</Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${job.progress}%` }}></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8">{job.progress}%</span>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100">
                <Badge variant="outline" className="text-gray-600">
                  5 jobs in queue
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAlerts.map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <alert.icon className={`h-4 w-4 mt-0.5 ${alert.color}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                    <div className="text-xs text-gray-500">{alert.time}</div>
                  </div>
                </div>
              ))}
              <Button variant="link" className="text-blue-600 p-0 h-auto">
                View All Alerts →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
