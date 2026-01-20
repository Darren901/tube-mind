import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NotionConnect } from '@/components/settings/notion-connect'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Fetch user settings and account status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: {
        where: { provider: 'notion' },
        select: { id: true },
      },
    },
  })

  if (!user) {
    // Should verify if this handles the edge case where session exists but user DB record doesn't
    redirect('/auth/signin')
  }

  const isConnected = user.accounts.length > 0

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Manage your account settings and integrations.
        </p>
      </div>
      
      <div className="space-y-6">
        <NotionConnect 
          initialParentPageId={user.notionParentPageId} 
          isConnected={isConnected} 
        />
      </div>
    </div>
  )
}
