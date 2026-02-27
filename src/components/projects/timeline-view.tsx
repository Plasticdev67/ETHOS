import { prisma } from "@/lib/db"
import { TimelineContainer } from "./timeline-container"

async function getTimelineProjects() {
  return prisma.project.findMany({
    where: { projectStatus: { notIn: ["COMPLETE"] } },
    orderBy: [{ orderReceived: "asc" }, { enquiryReceived: "asc" }],
    select: {
      id: true,
      projectNumber: true,
      name: true,
      projectStatus: true,
      priority: true,
      enquiryReceived: true,
      orderReceived: true,
      targetCompletion: true,
      actualCompletion: true,
      p2Date: true,
      p3Date: true,
      p4Date: true,
      p5Date: true,
      customer: { select: { id: true, name: true } },
      coordinator: { select: { name: true } },
    },
  })
}

export type TimelineProjectData = {
  id: string
  projectNumber: string
  name: string
  projectStatus: string
  priority: string
  enquiryReceived: string | null
  orderReceived: string | null
  targetCompletion: string | null
  actualCompletion: string | null
  p2Date: string | null
  p3Date: string | null
  p4Date: string | null
  p5Date: string | null
  customer: { id: string; name: string } | null
  coordinator: { name: string } | null
}

export async function TimelineView() {
  const projects = await getTimelineProjects()
  const serialized: TimelineProjectData[] = JSON.parse(JSON.stringify(projects))

  const timelineProjects = serialized.filter(
    (p) => p.enquiryReceived || p.orderReceived
  )

  if (timelineProjects.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-400">
        No projects with date information to display.
      </div>
    )
  }

  return <TimelineContainer projects={timelineProjects} />
}
