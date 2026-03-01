"use client"

import { Siren } from "lucide-react"
import Link from "next/link"

interface ICUProject {
  id: string
  projectNumber: string
  name: string
  customer: { name: string } | null
}

export function ICUCarousel({ projects }: { projects: ICUProject[] }) {
  if (projects.length === 0) return null

  // Double the items for seamless loop
  const items = [...projects, ...projects]

  return (
    <div className="relative overflow-hidden rounded-lg border border-red-200 bg-red-50 text-red-900">
      {/* Static left label */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-2 bg-red-50 pl-4 pr-6">
        <Siren className="h-4 w-4 text-red-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-red-500">ICU</span>
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-r from-red-50 to-transparent" />
      </div>

      {/* Scrolling ticker */}
      <div className="flex animate-scroll-left py-2.5 pl-24">
        {items.map((project, i) => (
          <Link
            key={`${project.id}-${i}`}
            href={`/projects/${project.id}`}
            className="flex shrink-0 items-center gap-3 px-6 hover:text-red-600 transition-colors"
          >
            <span className="font-mono text-xs font-semibold text-red-500">{project.projectNumber}</span>
            <span className="text-sm font-medium whitespace-nowrap">{project.name}</span>
            {project.customer && (
              <span className="text-xs text-red-400 whitespace-nowrap">({project.customer.name})</span>
            )}
            <span className="text-red-200 mx-2">|</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
