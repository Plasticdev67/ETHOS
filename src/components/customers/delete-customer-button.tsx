"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteCustomerButton({
  customerId,
  customerName,
  projectCount,
}: {
  customerId: string
  customerName: string
  projectCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setOpen(false)
        router.push("/customers")
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || "Failed to delete customer")
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        Delete
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Customer</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Are you sure you want to delete <strong>{customerName}</strong>?
            </p>

            {projectCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  This customer has <strong>{projectCount} project{projectCount !== 1 ? "s" : ""}</strong> linked to it.
                  Deleting this customer will remove the customer association from those projects.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
