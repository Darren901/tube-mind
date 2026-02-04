import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SummariesList } from '@/components/summaries/SummariesList'
import { SummaryGridSkeleton } from '@/components/summaries/SummaryGridSkeleton'

export default async function SummariesPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; channelId?: string; tagId?: string }
}) {
  const session = await getServerSession(authOptions)

  return (
    <Suspense 
      fallback={<SummaryGridSkeleton />} 
      key={JSON.stringify(searchParams)}
    >
      <SummariesList 
        searchParams={searchParams} 
        userId={session!.user.id} 
      />
    </Suspense>
  )
}
