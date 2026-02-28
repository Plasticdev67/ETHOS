"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Truck, Hash, FolderKanban, Package, PoundSterling, Boxes, ListTree, Cog, Wrench } from "lucide-react"
import { CSVImporter, FieldMapping } from "@/components/import/csv-importer"

const importTypes = [
  {
    key: "customers",
    label: "Customers",
    icon: Users,
    description: "Import customer list from Sage or spreadsheet",
    fields: [
      { key: "name", label: "Name", required: true, description: "Customer / company name" },
      { key: "customerType", label: "Type", required: false, description: "Main Contractor, Utility, Council, Direct, Defence" },
      { key: "email", label: "Email", required: false },
      { key: "phone", label: "Phone", required: false },
      { key: "address", label: "Address", required: false },
      { key: "paymentTerms", label: "Payment Terms", required: false, description: "e.g. 30 days, 60 days" },
      { key: "notes", label: "Notes", required: false },
    ] as FieldMapping[],
  },
  {
    key: "suppliers",
    label: "Suppliers",
    icon: Truck,
    description: "Import supplier list from Sage or spreadsheet",
    fields: [
      { key: "name", label: "Name", required: true, description: "Supplier / company name" },
      { key: "email", label: "Email", required: false },
      { key: "phone", label: "Phone", required: false },
      { key: "address", label: "Address", required: false },
      { key: "whatTheySupply", label: "What They Supply", required: false, description: "e.g. Steel, Fixings, Paint" },
      { key: "paymentTerms", label: "Payment Terms", required: false },
      { key: "notes", label: "Notes", required: false },
    ] as FieldMapping[],
  },
  {
    key: "nominal-codes",
    label: "Nominal Codes",
    icon: Hash,
    description: "Import nominal codes from Sage Chart of Accounts",
    fields: [
      { key: "code", label: "Code", required: true, description: "Nominal code e.g. 4000, 4100" },
      { key: "description", label: "Description", required: true, description: "e.g. Steel / Raw Materials" },
      { key: "category", label: "Category", required: false, description: "Materials, Labour, Plant Hire, Sub Contract, Transport, Overheads, Prelims, Design" },
    ] as FieldMapping[],
  },
  {
    key: "projects",
    label: "Projects",
    icon: FolderKanban,
    description: "Import projects from your existing tracker or system",
    fields: [
      { key: "name", label: "Project Name", required: true },
      { key: "projectNumber", label: "Project Number", required: false, description: "Will auto-generate if blank" },
      { key: "customer", label: "Customer Name", required: false, description: "Must match an existing customer" },
      { key: "coordinator", label: "Coordinator", required: false, description: "Must match a team member name" },
      { key: "workStream", label: "Work Stream", required: false, description: "Community, Utilities, Bespoke, Blast, Bund, Refurbishment" },
      { key: "salesStage", label: "Sales Stage", required: false, description: "Opportunity, Quoted, Order" },
      { key: "projectStatus", label: "Status", required: false, description: "Opportunity, Quotation, Design, Manufacture, Installation, Review, Complete" },
      { key: "estimatedValue", label: "Estimated Value", required: false, description: "£ value — can include £ and commas" },
      { key: "contractValue", label: "Contract Value", required: false },
      { key: "siteLocation", label: "Site Location", required: false },
      { key: "enquiryReceived", label: "Enquiry Date", required: false, description: "Date format: DD/MM/YYYY or YYYY-MM-DD" },
      { key: "targetCompletion", label: "Target Completion", required: false },
      { key: "notes", label: "Notes", required: false },
    ] as FieldMapping[],
  },
  {
    key: "products",
    label: "Products / Line Items",
    icon: Package,
    description: "Import products from your Excel tracker into existing projects",
    fields: [
      { key: "projectNumber", label: "Project Number", required: true, description: "Must match an existing project" },
      { key: "partCode", label: "Part Code", required: false },
      { key: "description", label: "Description", required: true },
      { key: "additionalDetails", label: "Additional Details", required: false },
      { key: "quantity", label: "Quantity", required: false, description: "Defaults to 1" },
      { key: "jobNumber", label: "Job Number", required: false },
      { key: "designer", label: "Designer", required: false, description: "Must match a team member name" },
      { key: "department", label: "Department", required: false, description: "Planning, Design, Production, Installation, Review, Complete" },
      { key: "drawingNumber", label: "Drawing Number", required: false },
      { key: "requiredDate", label: "Required Date", required: false },
      { key: "notes", label: "Notes", required: false },
    ] as FieldMapping[],
  },
  {
    key: "stock-prices",
    label: "Part Prices",
    icon: PoundSterling,
    description: "Import component/material prices — updates stock items and feeds into BOM costing",
    fields: [
      { key: "stockCode", label: "Stock Item Code", required: true, description: "Unique part code e.g. FD-0003-FP, PP-DF-0015" },
      { key: "name", label: "Stock Item Name", required: false, description: "Description of the part" },
      { key: "productGroup", label: "Product Group", required: false, description: "e.g. RM-LP, RM-PP, RM-EX, RM-MP" },
      { key: "unitOfMeasure", label: "UoM", required: false, description: "EA, MM, M, etc." },
      { key: "averageBuyingPrice", label: "Average Buying Price", required: false, description: "£ cost — commas and £ signs stripped automatically" },
      { key: "supplier", label: "Supplier", required: false, description: "Supplier name" },
      { key: "leadTime", label: "Lead Time (days)", required: false, description: "Supplier lead time in days" },
      { key: "notes", label: "Notes", required: false },
    ] as FieldMapping[],
  },
  {
    key: "sage-stock-items",
    label: "Sage Stock Items",
    icon: Boxes,
    description: "Import full stock item records from Sage 200 — raw materials, components, and finished goods",
    fields: [
      { key: "stockCode", label: "Stock Code", required: true, description: "Unique stock item code e.g. FD-0003-FP" },
      { key: "name", label: "Name", required: true, description: "Stock item name / description" },
      { key: "description", label: "Description", required: false, description: "Extended description" },
      { key: "productGroup", label: "Product Group", required: false, description: "e.g. FG-FD, RM-LP, RM-PP" },
      { key: "productFamily", label: "Product Family", required: false, description: "e.g. Flood Doors, Penstock Penstocks" },
      { key: "itemSetType", label: "Item Set Type", required: false, description: "Analysis field from Sage" },
      { key: "operationType", label: "Operation Type", required: false },
      { key: "materialComposition", label: "Material", required: false, description: "e.g. Mild Steel, Stainless, Aluminium" },
      { key: "bomItemType", label: "BOM Item Type", required: false, description: "0=Non-stock, 1=Stock, 2=Phantom" },
      { key: "defaultMake", label: "Default Make", required: false, description: "true/false — is this a manufactured item?" },
      { key: "supplierRef", label: "Supplier Ref", required: false },
      { key: "supplierLeadTime", label: "Lead Time (days)", required: false },
      { key: "supplierLeadTimeUnit", label: "Lead Time Unit", required: false, description: "Days, Weeks, etc." },
      { key: "unitOfMeasure", label: "UoM", required: false, description: "EA, MM, M, KG, etc." },
      { key: "averageBuyingPrice", label: "Avg Buying Price", required: false, description: "£ cost" },
    ] as FieldMapping[],
  },
  {
    key: "sage-bom-headers",
    label: "Sage BOM Headers",
    icon: ListTree,
    description: "Import Bill of Materials headers from Sage 200 Manufacturing — one per finished good",
    fields: [
      { key: "headerRef", label: "Header Ref", required: true, description: "Stock code of the finished good (must exist in Stock Items)" },
      { key: "description", label: "Description", required: false },
      { key: "manufacturingInstructions", label: "Manufacturing Instructions", required: false },
      { key: "qualityStandard", label: "Quality Standard", required: false },
      { key: "revision", label: "Revision", required: false, description: "BOM revision / version" },
      { key: "defaultCostQty", label: "Default Cost Qty", required: false, description: "Defaults to 1" },
      { key: "defaultBuildQty", label: "Default Build Qty", required: false, description: "Defaults to 1" },
    ] as FieldMapping[],
  },
  {
    key: "sage-bom-components",
    label: "Sage BOM Components",
    icon: Cog,
    description: "Import BOM component lines — the raw materials and sub-assemblies that make up each finished good",
    fields: [
      { key: "headerRef", label: "Header Ref", required: true, description: "Stock code of the parent finished good" },
      { key: "stockCode", label: "Component Stock Code", required: true, description: "Stock code of the component material" },
      { key: "description", label: "Description", required: false },
      { key: "sequenceNo", label: "Sequence No", required: false, description: "Order within the BOM — auto-numbered if blank" },
      { key: "quantity", label: "Quantity", required: false, description: "Defaults to 1" },
      { key: "unitOfMeasure", label: "UoM", required: false, description: "EA, MM, M, KG, etc." },
      { key: "fixedQuantity", label: "Fixed Quantity", required: false, description: "true/false — does qty scale with build qty?" },
      { key: "notes", label: "Notes", required: false },
    ] as FieldMapping[],
  },
  {
    key: "sage-bom-operations",
    label: "Sage BOM Operations",
    icon: Wrench,
    description: "Import manufacturing operations — cutting, welding, painting, etc. with time and labour data",
    fields: [
      { key: "headerRef", label: "Header Ref", required: true, description: "Stock code of the parent finished good" },
      { key: "operationRef", label: "Operation Ref", required: true, description: "Operation code e.g. CUT, WELD, PAINT" },
      { key: "operationDescription", label: "Description", required: false, description: "e.g. Laser Cutting, MIG Welding" },
      { key: "sequenceNo", label: "Sequence No", required: false, description: "Order of operations — auto-numbered if blank" },
      { key: "labourRef", label: "Labour Ref", required: false, description: "Labour code from Sage" },
      { key: "labourDescription", label: "Labour Description", required: false },
      { key: "totalRunTimeMinutes", label: "Run Time (mins)", required: false, description: "Total run time in minutes" },
      { key: "totalLabourMinutes", label: "Labour Time (mins)", required: false, description: "Total labour time in minutes" },
      { key: "runTimeHours", label: "Run Hours", required: false, description: "Alternative: hours component of run time" },
      { key: "runTimeMinutes", label: "Run Minutes", required: false, description: "Alternative: minutes component" },
      { key: "runTimeSeconds", label: "Run Seconds", required: false, description: "Alternative: seconds component" },
      { key: "labourHours", label: "Labour Hours", required: false },
      { key: "labourMinutes", label: "Labour Minutes", required: false },
      { key: "labourSeconds", label: "Labour Seconds", required: false },
      { key: "isSubcontract", label: "Subcontract", required: false, description: "true/false" },
    ] as FieldMapping[],
  },
]

export default function ImportPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const selected = importTypes.find((t) => t.key === selectedType)

  async function handleImport(rows: Record<string, string>[]) {
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: selectedType, rows }),
    })
    return res.json()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Data Import</h1>
        <p className="text-sm text-gray-500">
          Import data from Sage, Excel, or CSV. Paste from a spreadsheet or upload a file — then map the columns to match.
        </p>
      </div>

      {/* Type selector */}
      {!selectedType && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {importTypes.map((t) => (
            <Card
              key={t.key}
              className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
              onClick={() => setSelectedType(t.key)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-lg bg-blue-50 p-2">
                    <t.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{t.label}</h3>
                </div>
                <p className="text-xs text-gray-500">{t.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.fields.filter((f) => f.required).map((f) => (
                    <Badge key={f.key} variant="secondary" className="text-xs">{f.label} *</Badge>
                  ))}
                  {t.fields.filter((f) => !f.required).slice(0, 3).map((f) => (
                    <Badge key={f.key} variant="outline" className="text-xs">{f.label}</Badge>
                  ))}
                  {t.fields.filter((f) => !f.required).length > 3 && (
                    <Badge variant="outline" className="text-xs">+{t.fields.filter((f) => !f.required).length - 3} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Back button when type selected */}
      {selectedType && (
        <div>
          <button
            onClick={() => setSelectedType(null)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Back to import types
          </button>
        </div>
      )}

      {/* Importer */}
      {selected && (
        <CSVImporter
          title={`Import ${selected.label}`}
          description={selected.description}
          fields={selected.fields}
          onImport={handleImport}
        />
      )}

      {/* Tips */}
      {!selectedType && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Import Tips</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>Import <strong>customers and suppliers first</strong>, then projects (so project imports can match customer names).</li>
              <li>Import <strong>projects before products</strong> — products need to link to existing project numbers.</li>
              <li>For <strong>BOM Library</strong>: Import in order — Stock Items first, then BOM Headers, then Components and Operations.</li>
              <li>From <strong>Sage</strong>: Export your Chart of Accounts as CSV for nominal codes, Customer List for customers, Supplier List for suppliers.</li>
              <li>From <strong>Excel</strong>: Select your rows including the header, copy (Ctrl+C), then paste into the import tool.</li>
              <li>Values like <strong>£125,000.00</strong> are handled automatically — £ signs and commas are stripped.</li>
              <li>Status fields are <strong>fuzzy matched</strong> — &ldquo;In Production&rdquo;, &ldquo;Manufacturing&rdquo;, &ldquo;Fabrication&rdquo; all map to Manufacture.</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
