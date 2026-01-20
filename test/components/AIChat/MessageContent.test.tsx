import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MessageContent } from '@/components/AIChat/MessageContent'

describe('MessageContent', () => {
  describe('User Role', () => {
    it('應該渲染為純文字且不解析 Markdown', () => {
      render(<MessageContent role="user" content="Hello **world**" />)
      const element = screen.getByText('Hello **world**')
      expect(element).toBeInTheDocument()
      expect(element).toHaveClass('whitespace-pre-wrap')
      // Ensure strong tag is not rendered
      expect(document.querySelector('strong')).not.toBeInTheDocument()
    })
  })

  describe('Assistant Role - Markdown', () => {
    it('應該解析基本 Markdown (粗體)', () => {
      render(<MessageContent role="assistant" content="Hello **bold**" />)
      const strongElement = document.querySelector('strong')
      expect(strongElement).toBeInTheDocument()
      expect(strongElement).toHaveTextContent('bold')
    })

    it('應該解析列表', () => {
      const content = `- Item 1
- Item 2`
      const { container } = render(<MessageContent role="assistant" content={content} />)
      
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(2)
      expect(listItems[0]).toHaveTextContent('Item 1')
      expect(listItems[1]).toHaveTextContent('Item 2')
    })
  })

  describe('Assistant Role - Timestamp Parsing', () => {
    it('應該將 [MM:SS] 轉換為時間戳記連結', () => {
      render(<MessageContent role="assistant" content="Check [02:30]" />)
      // The timestamp is rendered as a stylized span inside the link custom renderer
      // But accessible text should be "[02:30]"
      const timestamp = screen.getByText('[02:30]')
      expect(timestamp).toBeInTheDocument()
      
      // Check if it has the specific style class we used for timestamps
      // bg-brand-blue/20 is a good indicator
      expect(timestamp).toHaveClass('bg-brand-blue/20')
    })

    it('應該將 [MM:SS-MM:SS] 轉換為時間戳記連結', () => {
      render(<MessageContent role="assistant" content="Range [01:00-02:00]" />)
      const timestamp = screen.getByText('[01:00-02:00]')
      expect(timestamp).toBeInTheDocument()
      expect(timestamp).toHaveClass('bg-brand-blue/20')
    })

    it('應該處理多個時間戳記', () => {
      render(<MessageContent role="assistant" content="Start [00:10] End [05:00]" />)
      const t1 = screen.getByText('[00:10]')
      const t2 = screen.getByText('[05:00]')
      expect(t1).toBeInTheDocument()
      expect(t2).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('應該處理空內容', () => {
      const { container } = render(<MessageContent role="assistant" content="" />)
      expect(container).not.toBeEmptyDOMElement() // It renders a div
    })

    it('應該忽略格式錯誤的時間戳記', () => {
      render(<MessageContent role="assistant" content="Invalid [999:99]" />)
      // Should find the text, but check it's NOT styled as a timestamp
      // Typically non-timestamp text won't have the bg-brand-blue/20 class
      const text = screen.getByText(/Invalid \[999:99\]/)
      expect(text).toBeInTheDocument()
      // Since it's plain text inside a paragraph, we can't easily check class on the text node
      // But we can check that there are no timestamp styled elements
      const timestampElements = document.querySelectorAll('.bg-brand-blue\\/20')
      expect(timestampElements.length).toBe(0)
    })

    it('應該正確渲染一般連結', () => {
      render(<MessageContent role="assistant" content="[Google](https://google.com)" />)
      const link = screen.getByRole('link', { name: 'Google' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://google.com')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })
})
