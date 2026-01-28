import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
      <div className="relative">
        <div className="absolute inset-0 bg-brand-blue/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="w-10 h-10 text-brand-blue animate-spin relative z-10" />
      </div>
      <p className="mt-4 text-sm text-text-secondary font-ibm animate-pulse">
        Loading...
      </p>
    </div>
  )
}
