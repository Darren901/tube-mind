'use client'

import ReactMarkdown from 'react-markdown'

interface MessageContentProps {
  content: string
  role: 'user' | 'assistant'
}

export function MessageContent({ content, role }: MessageContentProps) {
  if (role === 'user') {
    return <div className="whitespace-pre-wrap">{content}</div>
  }

  // Pre-process content to convert timestamps to markdown links
  // Match [00:00] or [00:00-00:00] and convert to [00:00](timestamp:00:00)
  const processedContent = content.replace(
    /\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*-\s*\d{1,2}:\d{2}(?::\d{2})?)?)\]/g,
    (match, time) => `[${match}](timestamp:${time})`
  )

  return (
    <div className="markdown-content">
      <ReactMarkdown
        urlTransform={(url) => url}
        components={{
          // Custom renderer for links to handle timestamps
          a: ({ href, children }) => {
            if (href?.startsWith('timestamp:')) {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 text-xs font-mono bg-brand-blue/20 text-brand-blue rounded border border-brand-blue/30 no-underline hover:bg-brand-blue/30 transition-colors cursor-pointer select-none align-middle">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {children}
                </span>
              )
            }
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-blue hover:underline"
              >
                {children}
              </a>
            )
          },
          // Style other markdown elements
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 text-white">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 text-white">{children}</h3>,
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-brand-blue/50 pl-3 py-1 my-2 bg-white/5 rounded-r italic text-gray-300">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-gray-200">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-[#111] p-3 rounded-lg overflow-x-auto my-2 border border-white/10 text-xs">
              {children}
            </pre>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
