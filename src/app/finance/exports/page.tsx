"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileSpreadsheet, Users, Truck, Hash, Receipt, ShoppingCart, PoundSterling } from "lucide-react"

const exports = [
  {
    key: "customers",
    label: "Customers",
    icon: Users,
    description: "Export customer list in Sage import format (Account Ref, Company Name, Contact, Address, Phone, Email, Payment Terms)",
  },
  {
    key: "suppliers",
    label: "Suppliers",
    icon: Truck,
    description: "Export supplier list in Sage import format (Account Ref, Company Name, Contact, Address, Phone, Email, Payment Terms)",
  },
  {
    key: "nominal-codes",
    label: "Nominal Codes",
    icon: Hash,
    description: "Export Chart of Accounts — nominal codes with categories",
  },
  {
    key: "invoices",
    label: "Sales Invoices",
    icon: Receipt,
    description: "Export all applications for payment / invoices with project reference, amounts, dates, status",
  },
  {
    key: "purchase-orders",
    label: "Purchase Orders",
    icon: ShoppingCart,
    description: "Export all PO lines with nominal codes, supplier, project reference",
  },
  {
    key: "job-costing",
    label: "Job Costing / CVR",
    icon: PoundSterling,
    description: "Export contract vs budget vs committed vs actual per project — the full CVR report",
  },
]

export default function SageExportPage() {
  function handleDownload(type: string) {
    window.open(`/api/export/sage?type=${type}`, "_blank")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Sage Export</h1>
        <p className="text-sm text-gray-500">
          Download data in CSV format for import into Sage or other accounting software.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((exp) => (
          <Card key={exp.key} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <exp.icon className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-sm">{exp.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <p className="text-xs text-gray-500 mb-4">{exp.description}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDownload(exp.key)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-gray-400" />
            Import to Sage
          </h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>1. Download the CSV file for the data type you want to import.</li>
            <li>2. Open Sage and go to <strong>File &gt; Import</strong>.</li>
            <li>3. Select the appropriate record type (Customers, Suppliers, etc.).</li>
            <li>4. Map the CSV columns to the Sage fields — most should auto-map.</li>
            <li>5. Check the preview and click Import.</li>
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Tip</Badge>
            <span className="text-xs text-gray-500">Export nominal codes first, then customers/suppliers, then transactions.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
