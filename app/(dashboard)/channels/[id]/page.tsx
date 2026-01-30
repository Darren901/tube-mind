import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { DeleteChannelButton } from '@/components/DeleteChannelButton'
import { CreateSummaryButton } from '@/components/CreateSummaryButton'
import { ChannelSettings } from '@/components/ChannelSettings'
import { QuotaCard } from '@/components/QuotaCard'
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-rajdhani text-white mb-2">
            {channel.title}
          </h1>
          <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] mb-6" />

          <ChannelSettings
            channelId={channel.id}
            initialAutoRefresh={channel.autoRefresh}
            initialAutoSyncNotion={channel.autoSyncNotion}
          />
        </div>
        <DeleteChannelButton id={channel.id} />
      </div>

      <div className="mb-6">
        <QuotaCard />
      </div>

      <div className="grid gap-4">
        {channel.videos.map((video: any) => {
          const summary = video.summaries[0]
          const thumbnailUrl = video.thumbnail || `https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`

          return (
            <div
              key={video.id}
              className="p-6 bg-bg-secondary border border-white/5 rounded-lg hover:border-brand-blue/30 transition flex flex-col md:flex-row gap-6"
            >
              {/* Thumbnail */}
              <div className="relative w-full md:w-64 aspect-video shrink-0 rounded-md overflow-hidden bg-black/20 self-start">
                <Image
                  src={thumbnailUrl}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 256px"
                />
              </div>

              <div className="flex-1 flex flex-col">
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

                <div className="mt-auto pt-2">
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
