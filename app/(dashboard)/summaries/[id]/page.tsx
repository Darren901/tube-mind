import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'

interface SummaryContent {
  topic: string
  keyPoints: string[]
  sections: {
    timestamp: string
    title: string
    summary: string
  }[]
}

function timestampToSeconds(timestamp: string): number {
  const [mins, secs] = timestamp.split(':').map(Number)
  return mins * 60 + secs
}

export default async function SummaryDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  const summary = await prisma.summary.findFirst({
    where: {
      id: params.id,
      userId: session!.user.id,
    },
    include: {
      video: {
        include: {
          channel: true,
        },
      },
    },
  })

  if (!summary) {
    notFound()
  }

  if (summary.status !== 'completed') {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-white mb-4">
          {summary.status === 'processing' ? '處理中...' : '尚未完成'}
        </h1>
        <p className="text-gray-400">請稍後再回來查看</p>
      </div>
    )
  }

  const content = summary.content as unknown as SummaryContent

  return (
    <div className="max-w-4xl mx-auto">
      {/* 影片標題 */}
      <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent">
        {summary.video.title}
      </h1>
      <p className="text-gray-400 mb-8">{summary.video.channel.title}</p>

      {/* 主題 */}
      <div className="mb-8 p-6 bg-gradient-to-br from-purple-900/30 to-yellow-900/30 border border-purple-500/30 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">主題</h2>
        <p className="text-gray-300">{content.topic}</p>
      </div>

      {/* 核心觀點 */}
      <div className="mb-8 p-6 bg-gradient-to-br from-purple-900/20 to-yellow-900/20 border border-purple-500/30 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">核心觀點</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          {content.keyPoints.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      </div>

      {/* 詳細摘要 */}
      <h2 className="text-2xl font-bold text-white mb-6">詳細摘要</h2>
      <div className="space-y-6">
        {content.sections.map((section, i) => (
          <div
            key={i}
            className="border-l-4 border-purple-500 pl-6 py-2"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-gray-700 px-3 py-1 rounded text-sm font-mono text-gray-300">
                {section.timestamp}
              </span>
              <h3 className="font-bold text-white">{section.title}</h3>
              <a
                href={`https://youtube.com/watch?v=${summary.video.youtubeId}&t=${timestampToSeconds(section.timestamp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 text-sm hover:text-purple-300 transition"
              >
                跳轉觀看 →
              </a>
            </div>
            <p className="text-gray-300">{section.summary}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
