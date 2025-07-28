"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"
import { Download, FileText, Save, TrendingUp, Target, Zap, BarChart3, Bell, Search } from "lucide-react"

// Enhanced distribution data with statistical annotations
const distributionData = [
  { bracket: "55-65%", count2024: 12, count2025: 8, range: "55% to 65%", significance: false },
  { bracket: "65-75%", count2024: 45, count2025: 32, range: "65% to 75%", significance: false },
  { bracket: "75-85%", count2024: 123, count2025: 98, range: "75% to 85%", significance: true },
  { bracket: "85-95%", count2024: 287, count2025: 312, range: "85% to 95%", significance: true },
  { bracket: "95-105%", count2024: 342, count2025: 398, range: "95% to 105%", significance: true },
  { bracket: "105-115%", count2024: 298, count2025: 276, range: "105% to 115%", significance: true },
  { bracket: "115-125%", count2024: 156, count2025: 142, range: "115% to 125%", significance: false },
  { bracket: "125-135%", count2024: 67, count2025: 54, range: "125% to 135%", significance: false },
  { bracket: "135-145%", count2024: 23, count2025: 18, range: "135% to 145%", significance: false },
]

const modelMatrix = [
  { model: "Model A", a: "-", b: "0.023*", c: "0.156", d: "0.089", e: "0.201*" },
  { model: "Model B", a: "0.023*", b: "-", c: "0.134", d: "0.067", e: "0.178*" },
  { model: "Model C", a: "0.156", b: "0.134", c: "-", d: "-0.067", e: "0.044" },
  { model: "Model D", a: "0.089", b: "0.067", c: "-0.067", d: "-", e: "0.112" },
  { model: "Model E", a: "0.201*", b: "0.178*", c: "0.044", d: "0.112", e: "-" },
]

const insights = [
  { icon: TrendingUp, text: "23% improvement in tail accuracy", color: "text-emerald-600", bg: "bg-emerald-100" },
  { icon: Target, text: "87% of stores within ±10%", color: "text-blue-600", bg: "bg-blue-100" },
  { icon: Zap, text: "Peak accuracy at 9:00-11:00", color: "text-orange-600", bg: "bg-orange-100" },
]

const recommendations = [
  { text: "Deploy Sales V2.1 to all high-volume stores", priority: "high" },
  { text: "Investigate Weather model underperformance", priority: "medium" },
  { text: "Consider ensemble approach for seasonal items", priority: "low" },
]

export default function AnalyticsDashboard() {
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
                <BreadcrumbPage>Analytics Workbench</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className="bg-purple-100 text-purple-700">Week 42</Badge>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save
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
        {/* Top Section - Distribution and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Distribution Chart */}
          <Card className="lg:col-span-2 bg-white shadow-sm border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Distribution Comparison</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Statistical analysis of forecast accuracy patterns</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    PNG
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Statistical Tests */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 mb-3">Statistical Tests:</div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm text-gray-700">T-test</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm text-gray-700">Chi-square</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm text-gray-700">Kolmogorov-Smirnov</span>
                  </label>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="bracket" stroke="#6B7280" fontSize={11} />
                    <YAxis stroke="#6B7280" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(value, name, props) => [
                        value,
                        name === "count2024" ? "2024" : "2025",
                        props.payload.significance ? " (Significant)" : "",
                      ]}
                    />
                    <Legend />
                    <ReferenceLine y={300} stroke="#F59E0B" strokeDasharray="5 5" />
                    <Bar dataKey="count2024" fill="#93C5FD" name="2024" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="count2025" fill="#3B82F6" name="2025" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Statistical Summary */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Statistical Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-700">Mean Accuracy</div>
                <div className="text-2xl font-bold text-blue-900">92.4%</div>
                <div className="text-sm text-blue-600">±4.2%</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-700">Standard Deviation</div>
                <div className="text-xl font-bold text-purple-900">8.7%</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm font-medium text-emerald-700">Confidence Interval</div>
                <div className="text-lg font-semibold text-emerald-900">95%</div>
                <div className="text-sm text-emerald-600">[89.2% - 95.6%]</div>
              </div>
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Distribution:</span>
                  <Badge className="bg-emerald-100 text-emerald-700">Normal</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Skewness:</span>
                  <span className="text-sm font-medium">-0.12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Kurtosis:</span>
                  <span className="text-sm font-medium">2.89</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Model Performance Matrix */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Model Performance Matrix</CardTitle>
            <p className="text-sm text-gray-600">Pairwise comparison of model performance differences</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-semibold text-gray-700">Model</th>
                    <th className="text-center p-3 font-semibold text-gray-700">A</th>
                    <th className="text-center p-3 font-semibold text-gray-700">B</th>
                    <th className="text-center p-3 font-semibold text-gray-700">C</th>
                    <th className="text-center p-3 font-semibold text-gray-700">D</th>
                    <th className="text-center p-3 font-semibold text-gray-700">E</th>
                  </tr>
                </thead>
                <tbody>
                  {modelMatrix.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-semibold text-gray-900">{row.model}</td>
                      <td className="text-center p-3 font-mono">
                        <span className={row.a.includes("*") ? "text-orange-600 font-semibold" : "text-gray-600"}>
                          {row.a}
                        </span>
                      </td>
                      <td className="text-center p-3 font-mono">
                        <span className={row.b.includes("*") ? "text-orange-600 font-semibold" : "text-gray-600"}>
                          {row.b}
                        </span>
                      </td>
                      <td className="text-center p-3 font-mono">
                        <span className={row.c.includes("*") ? "text-orange-600 font-semibold" : "text-gray-600"}>
                          {row.c}
                        </span>
                      </td>
                      <td className="text-center p-3 font-mono">
                        <span className={row.d.includes("*") ? "text-orange-600 font-semibold" : "text-gray-600"}>
                          {row.d}
                        </span>
                      </td>
                      <td className="text-center p-3 font-mono">
                        <span className={row.e.includes("*") ? "text-orange-600 font-semibold" : "text-gray-600"}>
                          {row.e}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-gray-500">* Statistically significant (p {"<"} 0.05)</div>
          </CardContent>
        </Card>

        {/* Bottom Section - Insights and Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Insights */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${insight.bg}`}>
                    <insight.icon className={`h-4 w-4 ${insight.color}`} />
                  </div>
                  <span className="text-gray-900 font-medium">{insight.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Badge
                    className={`mt-0.5 ${
                      rec.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : rec.priority === "medium"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {index + 1}
                  </Badge>
                  <span className="text-gray-900 font-medium text-sm">{rec.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
