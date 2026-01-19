import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { SearchInput } from '@/components/SearchInput'
import { ChannelFilter } from '@/components/ChannelFilter'

export default async function SummariesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; channelId?: string }
}) {
  const session = await getServerSession(authOptions)
  const page = Number(searchParams.page) || 1
  const query = searchParams.q || ''
  const channelId = searchParams.channelId
  const pageSize = 12
  const skip = (page - 1) * pageSize

  // 1. Get all channels that have summaries for this user
  // We use this to populate the filter
  const channels = await prisma.channel.findMany({
    where: {
      videos: {
        some: {
          summaries: {
            some: {
              userId: session!.user.id
            }
          }
        }
      }
    },
    orderBy: {
      title: 'asc'
    }
  })

  // 2. Build where clause
  const where: any = {
    userId: session!.user.id,
    video: {
      title: { contains: query, mode: 'insensitive' as const },
    },
  }

  // Add channel filter if selected
  if (channelId) {
    where.video.channelId = channelId
  }

  const totalCount = await prisma.summary.count({ where })
  const totalPages = Math.ceil(totalCount / pageSize)

  const summaries = await prisma.summary.findMany({
    where,
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: pageSize,
  })

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold font-rajdhani text-white mb-2">
            所有摘要
          </h1>
          <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
        </div>
        <SearchInput placeholder="搜尋摘要..." />
      </div>

      <ChannelFilter channels={channels} />

      <div className="grid gap-4">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className="p-6 bg-bg-secondary border border-white/5 rounded-lg hover:border-brand-blue/30 transition"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <Link href={`/summaries/${summary.id}`} className="block group">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-blue transition-colors">
                    {summary.video.title}
                  </h3>
                </Link>
                <p className="text-text-secondary text-sm mb-2 font-ibm">
                  {summary.video.channel.title}
                </p>
              </div>
              
              <a 
                href={`https://youtube.com/watch?v=${summary.video.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-white p-1 transition-colors"
                title="在 YouTube 上觀看"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs px-2 py-1 rounded font-mono ${
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
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-8 mt-4">
          <Link
            href={{
              pathname: '/summaries',
              query: { ...searchParams, page: page - 1 }
            }}
            className={`p-2 rounded-lg hover:bg-white/10 text-white transition ${
              page <= 1 ? 'pointer-events-none opacity-30' : ''
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          
          <span className="font-mono text-brand-blue">
            {page} <span className="text-text-secondary">/</span> {totalPages}
          </span>
          
          <Link
            href={{
              pathname: '/summaries',
              query: { ...searchParams, page: page + 1 }
            }}
            className={`p-2 rounded-lg hover:bg-white/10 text-white transition ${
              page >= totalPages ? 'pointer-events-none opacity-30' : ''
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  )
}


