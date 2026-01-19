'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'

interface SearchInputProps {
  placeholder: string
  onSearch?: (term: string) => void
  defaultValue?: string
}

export function SearchInput({ placeholder, onSearch, defaultValue }: SearchInputProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    if (onSearch) {
      onSearch(term)
      return
    }

    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // Reset to page 1
    router.replace(`?${params.toString()}`)
  }, 300)

  return (
    <div className="relative w-full md:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <input
        type="text"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={defaultValue || searchParams.get('q')?.toString()}
        className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue transition font-ibm text-sm"
      />
    </div>
  )
}
