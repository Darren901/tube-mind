import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SearchInput } from '@/components/SearchInput'
import { FilterBar } from '@/components/summaries/FilterBar'
import { QuotaCard } from '@/components/QuotaCard'
import { SummariesList } from '@/components/summaries/SummariesList'
import { SummaryGridSkeleton } from '@/components/summaries/SummaryGridSkeleton'

export default async function SummariesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; channelId?: string; tagId?: string }
}) {
  const session = await getServerSession(authOptions)
  
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

      {/* Quota Card */}
      <div className="mb-6">
        <QuotaCard />
      </div>

      <FilterBar channels={channels} tags={tags} />

      <Suspense 
        fallback={<SummaryGridSkeleton />} 
        key={JSON.stringify(searchParams)}
      >
        <SummariesList 
          searchParams={searchParams} 
          userId={session!.user.id} 
        />
      </Suspense>
    </div>
  )
}
