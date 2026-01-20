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
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani text-white mb-2">
            設定
          </h1>
          <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 mt-4">
          管理您的帳號設定與整合功能。
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
