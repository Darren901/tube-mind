import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { DeleteSummaryButton } from '@/components/DeleteSummaryButton'
import { RetryButton } from '@/components/RetryButton'
import { ExportButton } from '@/components/summary/export-button'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { SummaryAIWrapper } from '@/components/AIChat/SummaryAIWrapper'
import { NotionIcon } from '@/components/icons'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { TagList } from '@/components/tags/TagList'
import type { SummaryTag, Tag } from '@prisma/client'

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
      summaryTags: {
        include: {
          tag: true,
        },
        orderBy: {
          createdAt: 'asc',
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
  const thumbnailUrl = summary.video.thumbnail || `https://i.ytimg.com/vi/${summary.video.youtubeId}/maxresdefault.jpg`

  // Serialize tags to avoid "Date objects not supported" error in Client Components
  const serializedTags = summary.summaryTags.map((st: SummaryTag & { tag: Tag }) => ({
    ...st,
    createdAt: st.createdAt.toISOString(),
    tag: {
      ...st.tag,
      createdAt: st.tag.createdAt.toISOString(),
      updatedAt: st.tag.updatedAt.toISOString(),
    }
  }))

  return (
    <SummaryAIWrapper videoId={summary.video.id} videoTitle={summary.video.title}>
      <div className="max-w-4xl mx-auto relative">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
          {/* Left Column: Title & Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-white font-rajdhani leading-tight mb-2">
              {summary.video.title}
            </h1>

            <p className="text-text-secondary text-lg font-ibm mb-4">{summary.video.channel.title}</p>

            <div className="mb-6">
              <TagList summaryId={summary.id} initialTags={serializedTags} />
            </div>

            <div className="flex items-center gap-2">
              {summary.notionSyncStatus === 'SUCCESS' && summary.notionUrl ? (
                <a
                  href={summary.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary border border-white/10 rounded-lg hover:text-white hover:bg-white/5 transition"
                  title="在 Notion 中開啟"
                >
                  <NotionIcon className="w-4 h-4" />
                  <span>Notion</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              ) : (
                <ExportButton summaryId={summary.id} />
              )}

              {summary.notionSyncStatus === 'FAILED' && (
                <div className="text-red-400 p-1.5 bg-red-500/10 rounded-lg border border-red-500/20" title="Notion 同步失敗">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}

              <DeleteSummaryButton id={summary.id} />
            </div>
          </div>

          {/* Right Column: Thumbnail */}
          <div className="w-full md:w-80 lg:w-96 shrink-0">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/20 border border-white/10 shadow-2xl">
              <Image
                src={thumbnailUrl}
                alt={summary.video.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 320px, 384px"
              />
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="mb-8">
          <AudioPlayer summaryId={summary.id} initialAudioUrl={summary.audioUrl} />
        </div>

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
