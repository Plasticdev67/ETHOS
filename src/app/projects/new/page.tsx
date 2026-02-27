import { prisma } from "@/lib/db"
import { NewProjectForm } from "@/components/projects/new-project-form"

export const dynamic = "force-dynamic"

async function getData() {
  const [customers, users] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
  return { customers, users }
}

export default async function NewProjectPage() {
  const { customers, users } = await getData()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">New Project</h1>
        <p className="text-sm text-gray-500">Create a new project. A project number will be auto-generated.</p>
      </div>
      <NewProjectForm customers={customers} users={users} />
    </div>
  )
}
