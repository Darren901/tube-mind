import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[400px] border border-white/5 rounded-2xl bg-bg-secondary/30 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
      {/* Icon with Glow */}
      <div className="relative mb-6 group">
        <div className="absolute -inset-4 bg-brand-blue/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner group-hover:border-brand-blue/30 transition-colors duration-500">
          <Icon className="w-10 h-10 text-text-secondary group-hover:text-brand-blue transition-colors duration-500" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-2 font-rajdhani tracking-wide">
        {title}
      </h3>
      
      <p className="text-text-secondary max-w-sm mb-8 font-ibm leading-relaxed">
        {description}
      </p>

      {action && (
        <Link
          href={action.href}
          className="bg-brand-blue hover:bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] font-ibm flex items-center gap-2"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
