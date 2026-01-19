'use client'

interface MessageContentProps {
  content: string
  role: 'user' | 'assistant'
}

interface ParsedPart {
  type: 'text' | 'timestamp' | 'bold'
  content: string
}

export function MessageContent({ content, role }: MessageContentProps) {
  if (role === 'user') {
    return <div>{content}</div>
  }

  // Parse AI response to separate timestamps and bold text
  const parts: ParsedPart[] = []
  
  // Combined regex to match both timestamps and bold text
  // Timestamps: [02:59] or [1:23:45]
  // Bold: **text**
  const combinedRegex = /(\[(\d{1,2}:\d{2}(?::\d{2})?)\])|(\*\*([^*]+)\*\*)/g
  
  let lastIndex = 0
  let match
  
  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before special formatting
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index)
      if (text) {
        parts.push({ type: 'text', content: text })
      }
    }
    
    // Check if it's a timestamp or bold text
    if (match[2]) {
      // It's a timestamp
      parts.push({ type: 'timestamp', content: match[2] })
    } else if (match[4]) {
      // It's bold text
      parts.push({ type: 'bold', content: match[4] })
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    if (text) {
      parts.push({ type: 'text', content: text })
    }
  }

  // If no special formatting found, return plain text
  if (parts.length === 0) {
    return <div className="whitespace-pre-wrap">{content}</div>
  }

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.type === 'timestamp') {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 text-xs font-mono bg-brand-blue/20 text-brand-blue rounded border border-brand-blue/30"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {part.content}
            </span>
          )
        }
        
        if (part.type === 'bold') {
          return (
            <strong key={index} className="font-bold text-white">
              {part.content}
            </strong>
          )
        }
        
        return <span key={index}>{part.content}</span>
      })}
    </div>
  )
}
