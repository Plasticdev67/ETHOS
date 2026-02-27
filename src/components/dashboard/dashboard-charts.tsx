"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"

type ChartProps = {
  projectsByStatus: { status: string; count: number }[]
  departmentCounts: { department: string; count: number }[]
  pipelineData: { stage: string; value: number; count: number }[]
  monthlyData: { month: string; quoted: number; ordered: number; completed: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  OPPORTUNITY: "#94a3b8",
  QUOTATION: "#60a5fa",
  DESIGN: "#a78bfa",
  MANUFACTURE: "#f59e0b",
  INSTALLATION: "#f97316",
  REVIEW: "#06b6d4",
  COMPLETE: "#22c55e",
}

const DEPT_COLORS: Record<string, string> = {
  PLANNING: "#94a3b8",
  DESIGN: "#a78bfa",
  PRODUCTION: "#f59e0b",
  INSTALLATION: "#f97316",
  REVIEW: "#06b6d4",
  COMPLETE: "#22c55e",
}

const PIPELINE_COLORS = ["#94a3b8", "#f59e0b", "#22c55e"]

function formatK(value: number) {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`
  return `£${value}`
}

function prettify(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

export function DashboardCharts({ projectsByStatus, departmentCounts, pipelineData, monthlyData }: ChartProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Pipeline Value Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={formatK} fontSize={11} />
              <YAxis type="category" dataKey="stage" fontSize={11} width={90} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`£${Number(value ?? 0).toLocaleString()}`, "Value"]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {pipelineData.map((_, i) => (
                  <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Projects by Status Donut */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Projects by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie
                  data={projectsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                >
                  {projectsByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [value, prettify(String(name))]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {projectsByStatus.map((s) => (
                <div key={s.status} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[s.status] || "#94a3b8" }} />
                  <span className="text-gray-600">{prettify(s.status)}</span>
                  <span className="ml-auto font-semibold">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Pipeline by Department */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Products by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={departmentCounts}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="department" fontSize={10} tickFormatter={prettify} />
              <YAxis fontSize={11} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [value, "Products"]}
                labelFormatter={(label) => prettify(String(label))}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {departmentCounts.map((entry) => (
                  <Cell key={entry.department} fill={DEPT_COLORS[entry.department] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Monthly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Line type="monotone" dataKey="quoted" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} name="Quoted" />
              <Line type="monotone" dataKey="ordered" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Ordered" />
              <Line type="monotone" dataKey="completed" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
