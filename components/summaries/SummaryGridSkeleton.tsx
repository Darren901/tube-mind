import { Skeleton } from '@/components/Skeleton'

export function SummaryGridSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-6 bg-bg-secondary/30 border border-white/5 rounded-lg"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Thumbnail */}
            <Skeleton className="w-full md:w-48 aspect-video rounded-lg flex-shrink-0 bg-white/10" />

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4 bg-white/10" /> {/* Title */}
                  <Skeleton className="h-6 w-1/2 bg-white/10" /> {/* Title Line 2 */}
                </div>
                <Skeleton className="w-8 h-8 rounded-lg" /> {/* External Link Icon */}
              </div>
              
              <Skeleton className="h-4 w-32 mt-3 mb-4" /> {/* Channel Name */}

              {/* Tags */}
              <div className="flex gap-2 mt-auto pt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
