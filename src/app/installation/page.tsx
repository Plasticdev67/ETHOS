import { prisma } from "@/lib/db"
import { DepartmentBoard, type DeptProject } from "@/components/departments/department-board"

export const revalidate = 60

async function getInstallationProjects() {
  return prisma.project.findMany({
    where: { projectStatus: "INSTALLATION" },
    orderBy: [{ priority: "asc" }, { orderReceived: "asc" }],
    select: {
      id: true,
      projectNumber: true,
      name: true,
      projectStatus: true,
      departmentStatus: true,
      priority: true,
      contractValue: true,
      targetCompletion: true,
      p2Date: true,
      p3Date: true,
      p4Date: true,
      customer: { select: { name: true } },
      coordinator: { select: { name: true } },
      projectManager: { select: { name: true } },
    },
  })
}

export default async function InstallationPage() {
  const projects = await getInstallationProjects()
  const serialized: DeptProject[] = JSON.parse(JSON.stringify(projects))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Installation Department</h1>
          <p className="text-sm text-gray-500 mt-1">
            {serialized.length} project{serialized.length !== 1 ? "s" : ""} in installation phase
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-300" /> To Do</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400" /> Ongoing</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400" /> Review</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400" /> Done</span>
        </div>
      </div>

      <DepartmentBoard
        projects={serialized}
        departmentLabel="Installation"
        doneLabel="Ready for Review"
      />
    </div>
  )
}
