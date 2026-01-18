import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  const summaries = await prisma.summary.findMany({
    where: { userId: session!.user.id },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        最近摘要
      </h1>

      {summaries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-4">還沒有任何摘要</p>
          <Link
            href="/channels"
            className="inline-block bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            新增頻道
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {summaries.map((summary) => (
            <Link
              key={summary.id}
              href={`/summaries/${summary.id}`}
              className="p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition"
            >
              <h3 className="text-xl font-semibold text-white mb-2">
                {summary.video.title}
              </h3>
              <p className="text-gray-400 text-sm mb-2">
                {summary.video.channel.title}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    summary.status === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : summary.status === 'processing'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : summary.status === 'failed'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {summary.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
