"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { TrendingUp, Activity, Download, FileText, Bell, Search } from "lucide-react"

// Mock data for the bell curve distribution
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

const modelPerformance = [
  { name: "Sales V2.1", accuracy: 96, color: "#10B981" },
  { name: "Seasonal", accuracy: 94, color: "#3B82F6" },
  { name: "Holiday", accuracy: 89, color: "#F59E0B" },
  { name: "Weather", accuracy: 82, color: "#EF4444" },
]

const topPerformers = [
  { name: "Downtown Mall", accuracy: 98.2, color: "bg-emerald-100 text-emerald-700" },
  { name: "Suburban Plaza", accuracy: 97.8, color: "bg-blue-100 text-blue-700" },
  { name: "City Center", accuracy: 96.9, color: "bg-purple-100 text-purple-700" },
]

const bottomPerformers = [
  { name: "Airport Store", accuracy: 76.4, color: "bg-red-100 text-red-700" },
  { name: "Outlet Mall", accuracy: 78.1, color: "bg-orange-100 text-orange-700" },
  { name: "Rural Branch", accuracy: 79.3, color: "bg-yellow-100 text-yellow-700" },
]

export default function ExecutiveDashboard() {
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
                <BreadcrumbPage>Executive Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Production</Badge>
        </div>
      </header>

      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Good morning, Executive Team</h1>
          <p className="text-gray-600">Here's your forecast performance overview for today</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Overall Accuracy</p>
                  <p className="text-3xl font-bold text-gray-900">92.4%</p>
                  <div className="flex items-center text-sm text-emerald-600 mt-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +2.3% from last month
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Best Model</p>
                  <p className="text-3xl font-bold text-gray-900">96.2%</p>
                  <p className="text-sm text-gray-500 mt-1">Sales V2.1</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Target Range</p>
                  <p className="text-3xl font-bold text-gray-900">647/750</p>
                  <p className="text-sm text-gray-500 mt-1">Stores (85-115%)</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-purple-600 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Runs</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div>
                      <p className="text-lg font-semibold text-emerald-600">3</p>
                      <p className="text-xs text-gray-500">Active</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-orange-600">5</p>
                      <p className="text-xs text-gray-500">Queue</p>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Chart */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">Forecast Accuracy Distribution</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Bell curve showing store performance across accuracy ranges
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="border-gray-200 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="border-gray-200 bg-transparent">
                  <FileText className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="bracket" stroke="#6B7280" fontSize={12} />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={12}
                    label={{
                      value: "Store Count",
                      angle: -90,
                      position: "insideLeft",
                      style: { textAnchor: "middle", fill: "#6B7280" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value, name) => [value, name === "count2024" ? "2024" : "2025"]}
                    labelFormatter={(label) =>
                      `Accuracy Range: ${distributionData.find((d) => d.bracket === label)?.range}`
                    }
                  />
                  <Legend />
                  <Bar dataKey="count2024" fill="#93C5FD" name="2024" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="count2025" fill="#3B82F6" name="2025" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Comparison */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Model Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {modelPerformance.map((model) => (
                <div key={model.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{model.name}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${model.accuracy}%`,
                          backgroundColor: model.color,
                        }}
                      ></div>
                    </div>
                    <span className="font-semibold text-gray-900 w-12 text-right">{model.accuracy}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top/Bottom Performers */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Store Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Performers</h4>
                <div className="space-y-2">
                  {topPerformers.map((store, index) => (
                    <div key={store.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <Badge className={store.color}>{index + 1}</Badge>
                        <span className="text-sm font-medium text-gray-900">{store.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">{store.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Needs Attention</h4>
                <div className="space-y-2">
                  {bottomPerformers.map((store) => (
                    <div key={store.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">{store.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{store.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
