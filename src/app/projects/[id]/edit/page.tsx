import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { EditProjectForm } from "@/components/projects/edit-project-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [project, customers, users] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  if (!project) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Project</h1>
        <p className="text-sm text-gray-500">Update project details for {project.projectNumber}</p>
      </div>
      <EditProjectForm
        project={project as Parameters<typeof EditProjectForm>[0]["project"]}
        customers={customers}
        users={users}
      />
    </div>
  )
}
