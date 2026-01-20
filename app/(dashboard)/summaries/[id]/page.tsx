import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { DeleteSummaryButton } from '@/components/DeleteSummaryButton'
import { RetryButton } from '@/components/RetryButton'
import { ExportButton } from '@/components/summary/export-button'
import { AlertCircle } from 'lucide-react'
import { SummaryAIWrapper } from '@/components/AIChat/SummaryAIWrapper'

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
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
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
    const isFailed = summary.status === 'failed'
    
    return (
      <div className="text-center py-12 relative group max-w-2xl mx-auto">
        <div className="absolute top-0 right-0">
          <DeleteSummaryButton id={summary.id} />
        </div>
        
        {isFailed ? (
          <div className="flex flex-col items-center gap-6">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-full">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 font-rajdhani">
                摘要生成失敗
              </h1>
              <p className="text-text-secondary font-ibm mb-4">
                抱歉，我們在處理這部影片時遇到了問題。
              </p>
              
              {summary.errorMessage && (
                <div className="bg-bg-secondary border border-white/10 p-4 rounded-lg text-left mb-6 font-mono text-sm text-red-300 max-w-full overflow-auto">
                  {summary.errorMessage}
                </div>
              )}
            </div>
            
            <RetryButton id={summary.id} />
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-white mb-4 font-rajdhani animate-pulse">
              {summary.status === 'processing' ? 'AI 正在分析影片...' : '等待處理中...'}
            </h1>
            <p className="text-text-secondary font-ibm">這可能需要幾分鐘的時間，您可以稍後再回來查看。</p>
          </div>
        )}
      </div>
    )
  }

  const content = summary.content as unknown as SummaryContent

  return (
    <SummaryAIWrapper videoId={summary.video.id} videoTitle={summary.video.title}>
      <div className="max-w-4xl mx-auto relative">
        <div className="absolute top-0 right-0 flex items-center gap-2">
          <ExportButton summaryId={summary.id} />
          <DeleteSummaryButton id={summary.id} />
        </div>
        
        {/* 影片標題 */}
        <h1 className="text-4xl font-bold mb-2 text-white font-rajdhani pr-12">
          {summary.video.title}
        </h1>
        <p className="text-text-secondary mb-8 font-ibm">{summary.video.channel.title}</p>

        {/* 主題 */}
        <div className="mb-8 p-6 bg-bg-secondary border border-white/10 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani">主題</h2>
          <p className="text-gray-300 font-ibm">{content.topic}</p>
        </div>

        {/* 核心觀點 */}
        <div className="mb-8 p-6 bg-bg-secondary border border-white/10 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-4 font-rajdhani">核心觀點</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-300 font-ibm">
            {content.keyPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>

        {/* 詳細摘要 */}
        <h2 className="text-2xl font-bold text-white mb-6 font-rajdhani">詳細摘要</h2>
        <div className="space-y-6">
          {content.sections.map((section, i) => (
            <div
              key={i}
              className="border-l-4 border-brand-blue pl-6 py-2"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-white/10 px-3 py-1 rounded text-sm font-mono text-brand-blue">
                  {section.timestamp}
                </span>
                <h3 className="font-bold text-white font-ibm">{section.title}</h3>
                <a
                  href={`https://youtube.com/watch?v=${summary.video.youtubeId}&t=${timestampToSeconds(section.timestamp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue text-sm hover:text-blue-400 transition font-ibm"
                >
                  跳轉觀看 →
                </a>
              </div>
              <p className="text-gray-300 font-ibm">{section.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </SummaryAIWrapper>
  )
}
