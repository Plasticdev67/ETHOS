"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Download,
  FileText,
  LayoutDashboard,
  Target,
  PenTool,
  Factory,
  ShoppingCart,
  PoundSterling,
  FolderKanban,
} from "lucide-react"

const sops = [
  {
    title: "System Overview",
    description:
      "Dashboard, navigation, themes, user roles, login, and system architecture.",
    file: "ETHOS-System-Overview-SOP.pdf",
    icon: LayoutDashboard,
    pages: 10,
    color: "text-blue-600 bg-blue-50",
  },
  {
    title: "CRM & Quoting",
    description:
      "Contacts, opportunities, pipeline, quote builder, approval workflow, and project conversion.",
    file: "ETHOS-CRM-Quoting-SOP.pdf",
    icon: Target,
    pages: 11,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    title: "Design Module",
    description:
      "Design board, job cards, checklists, GA/BOM workflow, review process, and design handover.",
    file: "ETHOS-Design-Module-SOP.pdf",
    icon: PenTool,
    pages: 7,
    color: "text-violet-600 bg-violet-50",
  },
  {
    title: "Production & Workshop",
    description:
      "Production board, stage management, shopfloor view, workshop dashboard, and handover integration.",
    file: "ETHOS-Production-SOP.pdf",
    icon: Factory,
    pages: 10,
    color: "text-orange-600 bg-orange-50",
  },
  {
    title: "Purchasing",
    description:
      "Suppliers, purchase orders, smart PO from BOM, approval workflow, cost variance, and RFQ/enquiries.",
    file: "ETHOS-Purchasing-SOP.pdf",
    icon: ShoppingCart,
    pages: 10,
    color: "text-pink-600 bg-pink-50",
  },
  {
    title: "Finance",
    description:
      "Chart of accounts, journals, sales/purchase ledger, banking, VAT, fixed assets, reports, and year-end.",
    file: "ETHOS-Finance-SOP.pdf",
    icon: PoundSterling,
    pages: 15,
    color: "text-amber-600 bg-amber-50",
  },
  {
    title: "Project Management",
    description:
      "Project lifecycle, products, NCRs, variations, installation, completion, and RAG tracking.",
    file: "ETHOS-Projects-SOP.pdf",
    icon: FolderKanban,
    pages: 11,
    color: "text-cyan-600 bg-cyan-50",
  },
]

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Documentation
        </h1>
        <p className="text-sm text-gray-500">
          ETHOS system guides — standard operating procedures for each module.
          Version 1.0 | March 2026.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sops.map((sop) => {
          const Icon = sop.icon
          return (
            <Card
              key={sop.file}
              className="group hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`shrink-0 rounded-lg p-2.5 ${sop.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 leading-tight">
                      {sop.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {sop.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {sop.pages} pages
                  </span>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                  >
                    <a
                      href={`/sops/${sop.file}`}
                      download
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs text-gray-500">
          <strong>Document Control</strong> — These SOPs are generated from the
          ETHOS codebase and versioned alongside the application. For the latest
          version, download directly from this page. Report corrections or
          updates via the Suggestion Box.
        </p>
      </div>
    </div>
  )
}
