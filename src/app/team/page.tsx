import { prisma } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { EditUserRow } from "@/components/team/edit-user-row"
import { AddUserDialog } from "@/components/team/add-user-dialog"

export const dynamic = 'force-dynamic'

async function getUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          coordinatedProjects: true,
          designedProducts: true,
          coordinatedProducts: true,
        },
      },
    },
  })
}

export default async function TeamPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">{users.length} team members</p>
        </div>
        <AddUserDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Assignments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <EditUserRow key={user.id} user={user} />
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No team members yet. Add your first team member to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
