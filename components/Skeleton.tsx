export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse bg-white/5 rounded-md ${className}`}
      {...props}
    />
  )
}
