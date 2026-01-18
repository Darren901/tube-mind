import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

export default async function SummariesPage() {
  const session = await getServerSession(authOptions)

  const summaries = await prisma.summary.findMany({
    where: { userId: session!.user.id },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 font-rajdhani text-white">
        所有摘要
      </h1>

      <div className="grid gap-4">
        {summaries.map((summary) => (
          <div
            key={summary.id}
            className="p-6 bg-bg-secondary border border-white/5 rounded-lg hover:border-brand-blue/30 transition"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <Link href={`/summaries/${summary.id}`} className="block group">
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-blue transition-colors">
                    {summary.video.title}
                  </h3>
                </Link>
                <p className="text-text-secondary text-sm mb-2 font-ibm">
                  {summary.video.channel.title}
                </p>
              </div>
              
              <a 
                href={`https://youtube.com/watch?v=${summary.video.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-white p-1 transition-colors"
                title="在 YouTube 上觀看"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs px-2 py-1 rounded font-mono ${
                  summary.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : summary.status === 'processing'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : summary.status === 'failed'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}
              >
                {summary.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

