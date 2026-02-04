import { Skeleton } from '@/components/Skeleton'

export default function SummaryDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto relative">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
        {/* Left Column: Title & Info */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <Skeleton className="h-10 md:h-12 w-3/4 mb-4" />
          
          {/* Channel Name */}
          <Skeleton className="h-6 w-1/3 mb-6" />

          {/* Tags */}
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        {/* Right Column: Thumbnail & Audio Player */}
        <div className="w-full md:w-80 lg:w-96 shrink-0 space-y-6">
          {/* Thumbnail Skeleton */}
          <Skeleton className="w-full aspect-video rounded-xl bg-white/10" />
          
          {/* Audio Player Skeleton */}
          <Skeleton className="h-14 w-full rounded-xl bg-white/5" />
        </div>
      </div>

      {/* Topic Skeleton */}
      <div className="mb-8 p-6 bg-bg-secondary/30 border border-white/5 rounded-lg">
        <Skeleton className="h-8 w-24 mb-4" /> {/* Title: 主題 */}
        <Skeleton className="h-5 w-full mb-2" />
        <Skeleton className="h-5 w-3/4" />
      </div>

      {/* Key Points Skeleton */}
      <div className="mb-8 p-6 bg-bg-secondary/30 border border-white/5 rounded-lg">
        <Skeleton className="h-8 w-32 mb-4" /> {/* Title: 核心觀點 */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-full" />
        </div>
      </div>

      {/* Detailed Sections Skeleton */}
      <Skeleton className="h-8 w-32 mb-6" /> {/* Title: 詳細摘要 */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-l-4 border-white/10 pl-6 py-2">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-6 w-16 rounded" /> {/* Timestamp */}
              <Skeleton className="h-6 w-48" /> {/* Title */}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
