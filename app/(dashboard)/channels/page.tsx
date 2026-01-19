import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ChannelCard } from '@/components/ChannelCard'
import Link from 'next/link'
import { SearchInput } from '@/components/SearchInput'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string }
}) {
  const session = await getServerSession(authOptions)
  const page = Number(searchParams.page) || 1
  const query = searchParams.q || ''
  const pageSize = 12
  const skip = (page - 1) * pageSize

  const where = {
    userId: session!.user.id,
    title: { contains: query, mode: 'insensitive' as const },
  }

  const totalCount = await prisma.channel.count({ where })
  const totalPages = Math.ceil(totalCount / pageSize)

  const channels = await prisma.channel.findMany({
    where,
    include: {
      _count: {
        select: { videos: true },
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
            我的頻道
          </h1>
          <div className="w-20 h-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <SearchInput placeholder="搜尋頻道..." />
          <Link
            href="/channels/new"
            className="bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition font-ibm whitespace-nowrap"
          >
            新增頻道
          </Link>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-12 text-text-secondary font-ibm">
          <p>沒有找到符合的頻道</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-8 mt-4">
              <Link
                href={`/channels?page=${page - 1}${query ? `&q=${query}` : ''}`}
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
                href={`/channels?page=${page + 1}${query ? `&q=${query}` : ''}`}
                className={`p-2 rounded-lg hover:bg-white/10 text-white transition ${
                  page >= totalPages ? 'pointer-events-none opacity-30' : ''
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

