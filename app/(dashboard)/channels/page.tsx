import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ChannelCard } from '@/components/ChannelCard'
import Link from 'next/link'

export default async function ChannelsPage() {
  const session = await getServerSession(authOptions)

  const channels = await prisma.channel.findMany({
    where: { userId: session!.user.id },
    include: {
      _count: {
        select: { videos: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
          我的頻道
        </h1>
        <Link
          href="/channels/new"
          className="bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          新增頻道
        </Link>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>還沒有追蹤任何頻道</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  )
}
