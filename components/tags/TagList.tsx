'use client'

import { useState } from 'react'
import { Plus, X, Hash } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { SummaryTag, Tag } from '@prisma/client'

// Allow dates to be strings (from server) or Date objects (local optimistic updates)
type FlexibleDate<T> = {
  [K in keyof T]: T[K] extends Date ? Date | string : T[K]
}

type FlexibleSummaryTag = FlexibleDate<SummaryTag>
type FlexibleTag = FlexibleDate<Tag>

type SummaryTagWithTag = FlexibleSummaryTag & { tag: FlexibleTag }

interface TagListProps {
  summaryId: string
  initialTags: SummaryTagWithTag[]
}

export function TagList({ summaryId, initialTags }: TagListProps) {
  const [tags, setTags] = useState<SummaryTagWithTag[]>(initialTags)
  const [isAdding, setIsAdding] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const router = useRouter()

  // Add a new tag
  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setIsAdding(false)
      return
    }

    const tempId = `temp-${Date.now()}`
    const tagName = newTagName.trim()
    
    // Optimistic update
    const tempTag: SummaryTagWithTag = {
      id: tempId,
      summaryId,
      tagId: tempId,
      isConfirmed: true,
      createdBy: 'USER',
      createdAt: new Date(),
      tag: {
        id: tempId,
        name: tagName,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    setTags([...tags, tempTag])
    setNewTagName('')
    setIsAdding(false)

    try {
      const response = await fetch(`/api/summaries/${summaryId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName }),
      })

      if (!response.ok) throw new Error('Failed to add tag')

      const addedTag = await response.json()
      
      // Replace temp tag with real one
      setTags((prev) => prev.map((t) => (t.id === tempId ? addedTag : t)))
      router.refresh()
    } catch (error) {
      console.error('Error adding tag:', error)
      // Revert optimistic update
      setTags((prev) => prev.filter((t) => t.id !== tempId))
    }
  }

  // Confirm a tag (change status from unconfirmed to confirmed)
  const handleConfirmTag = async (tagToConfirm: SummaryTagWithTag) => {
    // Only allow confirming if it's not already confirmed
    if (tagToConfirm.isConfirmed) return

    // Optimistic update
    setTags((prev) =>
      prev.map((t) =>
        t.id === tagToConfirm.id ? { ...t, isConfirmed: true } : t
      )
    )

    try {
      const response = await fetch(
        `/api/summaries/${summaryId}/tags?tagId=${tagToConfirm.tagId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isConfirmed: true }),
        }
      )

      if (!response.ok) throw new Error('Failed to confirm tag')
      router.refresh()
    } catch (error) {
      console.error('Error confirming tag:', error)
      // Revert
      setTags((prev) =>
        prev.map((t) =>
          t.id === tagToConfirm.id ? { ...t, isConfirmed: false } : t
        )
      )
    }
  }

  // Delete a tag
  const handleDeleteTag = async (tagToDelete: SummaryTagWithTag) => {
    // Optimistic update
    setTags((prev) => prev.filter((t) => t.id !== tagToDelete.id))

    try {
      const response = await fetch(
        `/api/summaries/${summaryId}/tags?tagId=${tagToDelete.tagId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) throw new Error('Failed to delete tag')
      router.refresh()
    } catch (error) {
      console.error('Error deleting tag:', error)
      // Revert
      setTags((prev) => [...prev, tagToDelete])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTagName('')
    }
  }

  const confirmedTags = tags.filter((t) => t.isConfirmed)
  const suggestedTags = tags.filter((t) => !t.isConfirmed)

  return (
    <div className="flex flex-col gap-4">
      {/* Confirmed Tags Section */}
      <div className="flex flex-wrap items-center gap-2">
        {confirmedTags.length === 0 && !isAdding && (
          <span className="text-sm text-gray-500 italic">尚無標籤</span>
        )}
        
        {confirmedTags.map((summaryTag) => (
          <div
            key={summaryTag.id}
            className="group flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-all duration-200 cursor-default select-none bg-brand-blue/20 text-brand-blue hover:bg-brand-blue/30 border border-transparent"
          >
            <Hash className="w-3 h-3 opacity-70" />
            <span className="font-medium">{summaryTag.tag.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteTag(summaryTag)
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/20 rounded-full transition-opacity ml-0.5"
              aria-label="Remove tag"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {isAdding ? (
          <div className="flex items-center">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAddTag}
              autoFocus
              placeholder="New tag..."
              className="bg-bg-secondary border border-brand-blue/50 rounded-full px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-blue w-32"
            />
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm text-gray-400 border border-white/10 hover:border-brand-blue/50 hover:text-brand-blue hover:bg-white/5 transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Tag</span>
          </button>
        )}
      </div>

      {/* Suggested Tags Section */}
      {suggestedTags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-500">AI 建議標籤</span>
          <div className="flex flex-wrap items-center gap-2">
            {suggestedTags.map((summaryTag) => (
              <div
                key={summaryTag.id}
                className="group flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-all duration-200 cursor-pointer select-none bg-transparent text-gray-400 border border-dashed border-gray-600 hover:border-brand-blue/50 hover:text-brand-blue/80"
                onClick={() => handleConfirmTag(summaryTag)}
                title="Click to add suggestion"
              >
                <Plus className="w-3 h-3 opacity-70" />
                <span className="font-medium">{summaryTag.tag.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTag(summaryTag)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded-full transition-opacity ml-0.5"
                  aria-label="Remove suggestion"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
