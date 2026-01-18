import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ChannelDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  const channel = await prisma.channel.findFirst({
    where: {
      id: params.id,
      userId: session!.user.id,
    },
    include: {
      videos: {
        orderBy: { publishedAt: 'desc' },
        include: {
          summaries: {
            where: { userId: session!.user.id },
          },
        },
      },
    },
  })

  if (!channel) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        {channel.title}
      </h1>

      <div className="grid gap-4">
        {channel.videos.map((video) => {
          const summary = video.summaries[0]

          return (
            <div
              key={video.id}
              className="p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg"
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                {video.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {new Date(video.publishedAt).toLocaleDateString('zh-TW')}
              </p>

              {summary ? (
                <Link
                  href={`/summaries/${summary.id}`}
                  className="inline-block bg-gradient-to-r from-purple-600 to-yellow-600 hover:from-purple-500 hover:to-yellow-500 text-white text-sm font-semibold py-2 px-4 rounded transition"
                >
                  查看摘要
                </Link>
              ) : (
                <form action={`/api/summaries`} method="POST">
                  <input type="hidden" name="videoId" value={video.id} />
                  <button
                    type="submit"
                    className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold py-2 px-4 rounded transition"
                  >
                    建立摘要
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
