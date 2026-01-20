import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteChannelButton } from '@/components/DeleteChannelButton'
import { CreateSummaryButton } from '@/components/CreateSummaryButton'
import { ExternalLink } from 'lucide-react'

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
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani text-white mb-2">
            {channel.title}
          </h1>
          <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
        </div>
        <DeleteChannelButton id={channel.id} />
      </div>

      <div className="grid gap-4">
        {channel.videos.map((video) => {
          const summary = video.summaries[0]

          return (
            <div
              key={video.id}
              className="p-6 bg-bg-secondary border border-white/5 rounded-lg hover:border-brand-blue/30 transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 font-ibm pr-8">
                    {video.title}
                  </h3>
                  <p className="text-text-secondary text-sm font-mono">
                    {new Date(video.publishedAt).toLocaleDateString('zh-TW')}
                  </p>
                </div>
                <a
                  href={`https://youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-white p-1 transition-colors"
                  title="在 YouTube 上觀看"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              {summary ? (
                <Link
                  href={`/summaries/${summary.id}`}
                  className="inline-block bg-brand-blue hover:bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded transition font-ibm"
                >
                  查看摘要
                </Link>
              ) : (
                <CreateSummaryButton videoId={video.id} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

