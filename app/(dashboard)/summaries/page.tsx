import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { ExternalLink, ChevronLeft, ChevronRight, AlertCircle, FileText, SearchX } from 'lucide-react'
import { SearchInput } from '@/components/SearchInput'
import { FilterBar } from '@/components/summaries/FilterBar'
import { NotionIcon } from '@/components/icons'
import { EmptyState } from '@/components/EmptyState'

export default async function SummariesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; channelId?: string; tagId?: string }
}) {
  const session = await getServerSession(authOptions)
  const page = Number(searchParams.page) || 1
  const query = searchParams.q || ''
  const channelId = searchParams.channelId
  const tagId = searchParams.tagId
  const pageSize = 12
  const skip = (page - 1) * pageSize

  // 1. Get all channels that have summaries for this user
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

  // 2. Get all tags with counts (only confirmed ones)
  const allTags = await prisma.tag.findMany({
    where: {
      summaryTags: {
        some: {
          summary: { userId: session!.user.id },
          isConfirmed: true
        }
      }
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          summaryTags: {
            where: {
              summary: { userId: session!.user.id },
              isConfirmed: true
            }
          }
        }
      }
    }
  })

  // Sort by count descending
  allTags.sort((a, b) => b._count.summaryTags - a._count.summaryTags)
  
  // Cast to match FilterBar expectation (it expects the Prisma result type)
  const tags = allTags as any

  // 3. Build where clause
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

  // Add tag filter if selected
  if (tagId) {
    where.summaryTags = {
      some: {
        tagId: tagId
      }
    }
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
      summaryTags: {
        where: { isConfirmed: true },
        include: { tag: true },
        take: 3,
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
          <h1 className="text-3xl font-bold font-rajdhani text-white mb-2">
            所有摘要
          </h1>
          <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
        </div>
        <SearchInput placeholder="搜尋摘要..." />
      </div>

      <FilterBar channels={channels} tags={tags} />

      {summaries.length === 0 ? (
        <EmptyState
          icon={query || channelId || tagId ? SearchX : FileText}
          title={query || channelId || tagId ? '沒有找到符合的摘要' : '還沒有任何摘要'}
          description={
            query || channelId || tagId
              ? '請嘗試調整搜尋關鍵字或篩選條件'
              : '建立您的第一個 YouTube 影片摘要，開始高效學習！'
          }
          action={
            !(query || channelId || tagId)
              ? { label: '建立新摘要', href: '/summaries/new' }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {summaries.map((summary: any) => {
          const thumbnailUrl = summary.video.thumbnail || `https://i.ytimg.com/vi/${summary.video.youtubeId}/mqdefault.jpg`

          return (
            <div
              key={summary.id}
              className="p-6 bg-bg-secondary border border-white/5 rounded-lg hover:border-brand-blue/30 transition"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Thumbnail */}
                <div className="relative w-full md:w-48 aspect-video flex-shrink-0">
                  <Image
                    src={thumbnailUrl}
                    alt={summary.video.title}
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 768px) 100vw, 192px"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/summaries/${summary.id}`} className="block group">
                        <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-blue transition-colors line-clamp-2">
                          {summary.video.title}
                        </h3>
                      </Link>
                      <p className="text-text-secondary text-sm mb-2 font-ibm truncate">
                        {summary.video.channel.title}
                      </p>
                    </div>

                    <a
                      href={`https://youtube.com/watch?v=${summary.video.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-secondary hover:text-white p-1 transition-colors flex-shrink-0"
                      title="在 YouTube 上觀看"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>

                  {summary.summaryTags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {summary.summaryTags.map((st: any) => (
                        <span
                          key={st.tag.id}
                          className="text-xs bg-white/10 text-gray-300 rounded-full px-2 py-0.5"
                        >
                          #{st.tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-1 rounded font-mono ${summary.status === 'completed'
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

                    {/* Notion Status */}
                    {summary.notionUrl && (
                      <a
                        href={summary.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-text-secondary hover:text-white"
                        title="已同步至 Notion"
                      >
                        <NotionIcon className="w-4 h-4" />
                      </a>
                    )}
                    {summary.notionSyncStatus === 'FAILED' && (
                      <div
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-red-400 cursor-help"
                        title="Notion 同步失敗"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 py-8 mt-4">
          <Link
            href={{
              pathname: '/summaries',
              query: { ...searchParams, page: page - 1 }
            }}
            className={`p-2 rounded-lg hover:bg-white/10 text-white transition ${page <= 1 ? 'pointer-events-none opacity-30' : ''
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
            className={`p-2 rounded-lg hover:bg-white/10 text-white transition ${page >= totalPages ? 'pointer-events-none opacity-30' : ''
              }`}
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  )
}


