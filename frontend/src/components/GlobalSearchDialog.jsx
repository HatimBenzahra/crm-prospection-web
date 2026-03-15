import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { gql } from '@/services/core/graphql'
import {
  Search,
  Briefcase,
  UserCog,
  Shield,
  Building2,
  MapPin,
  DoorOpen,
  Loader2,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react'

const GLOBAL_SEARCH_QUERY = `
  query GlobalSearch($query: String!, $limit: Int) {
    globalSearch(query: $query, limit: $limit) {
      groups {
        category
        items {
          type
          id
          label
          sublabel
          url
        }
      }
      totalCount
    }
  }
`

const CATEGORY_CONFIG = {
  Commerciaux: { icon: Briefcase, color: 'text-blue-500 bg-blue-500/10' },
  Managers: { icon: UserCog, color: 'text-violet-500 bg-violet-500/10' },
  Directeurs: { icon: Shield, color: 'text-amber-500 bg-amber-500/10' },
  Immeubles: { icon: Building2, color: 'text-emerald-500 bg-emerald-500/10' },
  Portes: { icon: DoorOpen, color: 'text-orange-500 bg-orange-500/10' },
  Zones: { icon: MapPin, color: 'text-rose-500 bg-rose-500/10' },
}

export default function GlobalSearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const debounceRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    const handleCustomOpen = () => setOpen(true)

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('open-global-search', handleCustomOpen)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('open-global-search', handleCustomOpen)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const search = useCallback(async q => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const response = await gql(GLOBAL_SEARCH_QUERY, { query: q, limit: 5 })
      setResults(response.globalSearch?.groups || [])
      setSelectedIndex(0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = useCallback(
    value => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => search(value), 200)
    },
    [search]
  )

  const allItems = results.flatMap(g => g.items.map(item => ({ ...item, _category: g.category })))

  const handleSelect = useCallback(
    item => {
      setOpen(false)
      navigate(item.url)
    },
    [navigate]
  )

  const handleKeyDown = useCallback(
    e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && allItems[selectedIndex]) {
        e.preventDefault()
        handleSelect(allItems[selectedIndex])
      }
    },
    [allItems, selectedIndex, handleSelect]
  )

  let flatIndex = -1

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden rounded-2xl border-border/40 shadow-2xl">
        <div className="flex items-center gap-3 px-5 border-b border-border/40">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground/50 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un commercial, immeuble, porte..."
            className="flex-1 h-14 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/40"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded-md border border-border/40 bg-muted/50 px-2 font-mono text-[11px] font-medium text-muted-foreground/50">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto overscroll-contain">
          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/50 mb-4">
                <Search className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground/70">Aucun résultat</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Essayez un autre terme pour « {query} »
              </p>
            </div>
          )}

          {query.length < 2 && !loading && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/5 mb-4">
                <Search className="h-5 w-5 text-primary/40" />
              </div>
              <p className="text-sm text-muted-foreground/60">
                Tapez pour rechercher dans toute l'application
              </p>
              <div className="flex items-center gap-3 mt-4 text-[11px] text-muted-foreground/40">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono">
                    ↑↓
                  </kbd>{' '}
                  naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono">
                    ↵
                  </kbd>{' '}
                  ouvrir
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono">
                    esc
                  </kbd>{' '}
                  fermer
                </span>
              </div>
            </div>
          )}

          {results.map(group => {
            const config = CATEGORY_CONFIG[group.category] || {
              icon: Search,
              color: 'text-muted-foreground bg-muted',
            }
            const GroupIcon = config.icon
            return (
              <div key={group.category}>
                <div className="flex items-center gap-2.5 px-5 py-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {group.category}
                  </span>
                  <div className="flex-1 h-px bg-border/30" />
                  <span className="text-[10px] tabular-nums text-muted-foreground/40">
                    {group.items.length}
                  </span>
                </div>
                {group.items.map(item => {
                  flatIndex++
                  const isSelected = flatIndex === selectedIndex
                  const idx = flatIndex
                  return (
                    <button
                      type="button"
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-3 w-full px-5 py-3 text-left transition-all duration-100 ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <div
                        className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${config.color} transition-transform duration-100 ${isSelected ? 'scale-110' : ''}`}
                      >
                        <GroupIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{item.label}</div>
                        {item.sublabel && (
                          <div className="text-[11px] text-muted-foreground/50 truncate mt-0.5">
                            {item.sublabel}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        className={`h-3.5 w-3.5 text-muted-foreground/30 shrink-0 transition-all duration-100 ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`}
                      />
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {results.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/30 bg-muted/20">
            <span className="text-[11px] text-muted-foreground/40">
              {allItems.length} résultat{allItems.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/40">
              <CornerDownLeft className="h-3 w-3" />
              <span>pour ouvrir</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
