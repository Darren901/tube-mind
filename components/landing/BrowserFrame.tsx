'use client'

export function BrowserFrame({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`relative bg-bg-secondary rounded-xl border border-white/10 overflow-hidden shadow-2xl ${className}`}>
      {/* Browser Toolbar */}
      <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
        <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
        {/* Address Bar */}
        <div className="ml-4 flex-1 h-5 bg-black/20 rounded-md flex items-center px-2 max-w-[200px]">
          <div className="w-full h-1.5 bg-white/5 rounded-full" />
        </div>
      </div>
      
      {/* Content Area */}
      <div className="relative overflow-hidden bg-[#0A0A0A] h-full">
        {children}
      </div>
    </div>
  )
}
