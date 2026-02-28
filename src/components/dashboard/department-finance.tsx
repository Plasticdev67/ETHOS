import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, PoundSterling } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type FinanceData = {
  totalContractValue: number
  totalCostCommitted: number
  grossMarginPercent: number
  outstandingInvoices: { count: number; value: number }
}

export function DepartmentFinance({ data }: { data: FinanceData }) {
  const marginColor =
    data.grossMarginPercent >= 25
      ? "text-emerald-700"
      : data.grossMarginPercent >= 15
        ? "text-amber-700"
        : "text-red-700"

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PoundSterling className="h-4 w-4 text-green-600" />
            <CardTitle className="text-base font-semibold">Finance</CardTitle>
          </div>
          <Link href="/finance" className="text-xs font-medium text-blue-600 hover:text-blue-700">
            View Finance <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Contract Value & Cost */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 p-2.5">
            <div className="text-[10px] font-medium text-green-600 uppercase">Contract Value</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(data.totalContractValue)}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-2.5">
            <div className="text-[10px] font-medium text-gray-500 uppercase">Cost Committed</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(data.totalCostCommitted)}</div>
          </div>
        </div>

        {/* Margin */}
        <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
          <span className="text-xs font-medium text-gray-500">Gross Margin</span>
          <span className={`text-lg font-bold ${marginColor}`}>
            {data.grossMarginPercent.toFixed(1)}%
          </span>
        </div>

        {/* Outstanding invoices */}
        {data.outstandingInvoices.count > 0 ? (
          <Link href="/finance">
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2 cursor-pointer hover:shadow-sm transition-shadow">
              <div>
                <div className="text-xs font-medium text-amber-800">
                  {data.outstandingInvoices.count} outstanding invoice{data.outstandingInvoices.count !== 1 ? "s" : ""}
                </div>
                <div className="text-[10px] text-amber-600">{formatCurrency(data.outstandingInvoices.value)}</div>
              </div>
              <ArrowRight className="h-3 w-3 text-amber-600" />
            </div>
          </Link>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-center">
            <span className="text-xs font-medium text-green-700">All invoices settled</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
