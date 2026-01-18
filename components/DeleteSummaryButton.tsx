'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/providers/ConfirmProvider'

export function DeleteSummaryButton({ id }: { id: string }) {
  const router = useRouter()
  const { confirm } = useConfirm()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    const ok = await confirm({
      title: '刪除摘要',
      description: '確定要刪除此摘要嗎？此動作無法復原。',
      confirmText: '確認刪除',
      variant: 'danger'
    })
    
    if (!ok) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/summaries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      toast.success('摘要已刪除')
      router.push('/summaries')
      router.refresh()
    } catch (error) {
      toast.error('刪除失敗，請稍後再試')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
      title="刪除摘要"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  )
}
