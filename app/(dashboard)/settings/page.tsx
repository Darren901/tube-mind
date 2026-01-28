import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SettingsShell } from '@/components/settings/settings-shell'

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
        <p className="text-zinc-500 dark:text-zinc-400 mt-4 font-ibm">
          管理您的帳號偏好、AI 設定與第三方整合。
        </p>
      </div>

      <SettingsShell 
        userSettings={{
          summaryTone: user.summaryTone || 'professional',
          summaryToneCustom: user.summaryToneCustom,
          summaryDetail: user.summaryDetail || 'standard',
          ttsVoice: user.ttsVoice || 'female',
          notionParentPageId: user.notionParentPageId
        }}
        notionStatus={{ isConnected }}
      />
    </div>
  )
}
