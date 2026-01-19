'use client'

import { useState } from 'react'
import { useChat } from 'ai/react'
import { ChatWidget } from './ChatWidget'
import { TextSelectionMenu } from './TextSelectionMenu'

export function SummaryAIWrapper({ 
  videoId, 
  videoTitle,
  children 
}: { 
  videoId: string, 
  videoTitle: string, 
  children: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    api: '/api/chat',
    body: { videoId },
  })

  const handleExplain = (text: string) => {
    setIsOpen(true)
    append({
      role: 'user',
      content: `請解釋這段話：「${text}」`
    })
  }

  return (
    <>
      <div className="relative selection:bg-brand-blue/30 selection:text-white">
        <TextSelectionMenu onExplain={handleExplain} />
        {children}
      </div>

      <ChatWidget
        videoTitle={videoTitle}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        append={append}
      />
    </>
  )
}
