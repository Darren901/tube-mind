'use client'

import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
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
  
  const { messages, sendMessage, isLoading } = useChat() as any

  const handleSendMessage = (content: string) => {
    sendMessage({ text: content }, { body: { videoId } })
  }

  const handleExplain = (text: string) => {
    setIsOpen(true)
    handleSendMessage(`請解釋這段話：「${text}」`)
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
        messages={messages || []}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
      />
    </>
  )
}
