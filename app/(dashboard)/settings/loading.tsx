import { Skeleton } from '@/components/Skeleton'
import { Settings2 } from 'lucide-react'

export default function SettingsLoading() {
  return (
    <div>
      {/* Header Area */}
      <div className="mb-8">
        <div>
          <Skeleton className="h-9 w-24 mb-2" /> {/* Title: 設定 */}
          <Skeleton className="h-1 w-20 rounded-full bg-white/10" /> {/* Underline */}
        </div>
        <Skeleton className="h-5 w-64 mt-4" /> {/* Description */}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Sidebar Skeleton */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <div className="mb-6 px-2">
               <div className="flex items-center gap-2">
                 <Settings2 className="w-5 h-5 text-zinc-700" />
                 <Skeleton className="h-5 w-24" />
               </div>
            </div>
            
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                   <Skeleton className="w-4 h-4 rounded-sm" />
                   <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>

            {/* Version Info Skeleton */}
            <div className="mt-8 px-6 py-4 rounded-xl bg-white/5 border border-white/5 hidden lg:block space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </aside>

        {/* Main Content Skeleton (Simulating Summary Preferences Tab) */}
        <main className="flex-1 min-w-0">
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-bg-secondary border border-white/5 space-y-6">
               <div className="space-y-4">
                 <Skeleton className="h-6 w-32" />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-lg" />
                   ))}
                 </div>
               </div>
               
               <div className="pt-6 border-t border-white/5 space-y-4">
                  <Skeleton className="h-6 w-32" />
                  <div className="space-y-2">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                  </div>
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
