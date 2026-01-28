import { Skeleton } from '@/components/Skeleton'

export default function ChannelsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <Skeleton className="h-9 w-36 mb-2" />
          <Skeleton className="h-1 w-20 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Skeleton className="h-10 w-full md:w-48 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Channels Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-bg-secondary/30 border border-white/5 rounded-xl p-5 h-[180px] flex flex-col justify-between"
          >
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            
            <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/5">
               <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-8 bg-white/10" />
               </div>
               <Skeleton className="h-9 w-24 rounded-lg bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
