"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, Download, Trash2, FileText, FileImage, File } from "lucide-react"

const documentTypes = [
  { value: "DRAWING", label: "Drawing" },
  { value: "SPECIFICATION", label: "Specification" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "TEST_REPORT", label: "Test Report" },
  { value: "PHOTO", label: "Photo" },
  { value: "CORRESPONDENCE", label: "Correspondence" },
  { value: "OTHER", label: "Other" },
]

function getDocTypeColor(type: string) {
  const colors: Record<string, string> = {
    DRAWING: "bg-blue-100 text-blue-700",
    SPECIFICATION: "bg-purple-100 text-purple-700",
    CERTIFICATE: "bg-green-100 text-green-700",
    TEST_REPORT: "bg-amber-100 text-amber-700",
    PHOTO: "bg-pink-100 text-pink-700",
    CORRESPONDENCE: "bg-gray-100 text-gray-700",
    OTHER: "bg-gray-100 text-gray-700",
  }
  return colors[type] || "bg-gray-100 text-gray-700"
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
    return <FileImage className="h-5 w-5 text-pink-500" />
  }
  if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext || "")) {
    return <FileText className="h-5 w-5 text-blue-500" />
  }
  return <File className="h-5 w-5 text-gray-400" />
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Document = {
  id: string
  filename: string
  filePath: string
  fileSize: number | null
  documentType: string
  description: string | null
  uploadedAt: string
  productId: string | null
  product?: { partCode: string; description: string } | null
}

export function DocumentManager({
  projectId,
  documents,
  products,
}: {
  projectId: string
  documents: Document[]
  products?: { id: string; partCode: string; description: string }[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docType, setDocType] = useState("OTHER")
  const [description, setDescription] = useState("")
  const [productId, setProductId] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("projectId", projectId)
    formData.append("documentType", docType)
    if (description) formData.append("description", description)
    if (productId) formData.append("productId", productId)

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })
      if (res.ok) {
        setShowUploadForm(false)
        setSelectedFile(null)
        setDocType("OTHER")
        setDescription("")
        setProductId("")
        if (fileInputRef.current) fileInputRef.current.value = ""
        router.refresh()
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string) {
    setDeleting(docId)
    try {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  const selectClass = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Documents ({documents.length})</CardTitle>
          <Button size="sm" onClick={() => setShowUploadForm(!showUploadForm)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </CardHeader>

        {showUploadForm && (
          <CardContent className="border-t border-border pt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>File *</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className={selectClass}
                  >
                    {documentTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {products && products.length > 0 && (
                  <div className="space-y-2">
                    <Label>Related Product</Label>
                    <select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">None (project-level)</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.partCode} — {p.description}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the document..."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleUpload} disabled={!selectedFile || uploading}>
                  {uploading ? "Uploading..." : "Upload File"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowUploadForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        {/* Document List */}
        <CardContent className="p-0">
          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Uploaded</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.filename)}
                          <span className="font-medium text-gray-900 truncate max-w-[200px]">{doc.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className={getDocTypeColor(doc.documentType)}>
                          {doc.documentType.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 truncate max-w-[200px]">{doc.description || "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {doc.product ? doc.product.partCode : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{formatFileSize(doc.fileSize)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {new Date(doc.uploadedAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleting === doc.id}
                            className="inline-flex items-center justify-center rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center border-t border-border">
              <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No documents uploaded yet.</p>
              <p className="text-xs text-gray-400 mt-1">Upload drawings, specs, certificates and more.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
