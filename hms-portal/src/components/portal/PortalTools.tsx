"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Search, X } from "lucide-react"
import { Button } from "@/components/ui/Button"

type Hit = { id: string; title: string; subtitle: string; href: string }
type Note = {
  id: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export function PortalTools() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<Hit[]>([])
  const [searching, setSearching] = useState(false)
  const [settledQuery, setSettledQuery] = useState("")
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch("/api/notifications")
      .then(response => (response.ok ? response.json() : null))
      .then(body => {
        if (cancelled || !body) return
        setNotes(body.notifications)
        setUnread(body.unread)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!searchOpen || query.trim().length < 2) {
      setHits([])
      return
    }
    const handle = setTimeout(() => {
      setSearching(true)
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then(response => (response.ok ? response.json() : { results: [] }))
        .then(body => setHits(body.results ?? []))
        .catch(() => setHits([]))
        .finally(() => {
          setSearching(false)
          setSettledQuery(query.trim())
        })
    }, 250)
    return () => clearTimeout(handle)
  }, [query, searchOpen])

  async function markRead(note: Note) {
    if (note.readAt) return
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: note.id }),
    })
    setNotes(current =>
      current.map(item => (item.id === note.id ? { ...item, readAt: new Date().toISOString() } : item))
    )
    setUnread(count => Math.max(0, count - 1))
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 px-3"
          aria-expanded={searchOpen}
          aria-label="Search patients, records"
          onClick={() => {
            setNotesOpen(false)
            setSearchOpen(open => !open)
          }}
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline text-clay-500">Search patients, records...</span>
        </Button>
        {searchOpen && (
          <div className="absolute right-0 mt-2 w-80 max-w-[80vw] rounded-xl border border-cream-200 bg-cream-50 shadow-clay-lg p-3 z-50">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Name, visit, or invoice"
                aria-label="Search"
                className="clay-input flex-1"
              />
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}>
                <X className="w-4 h-4 text-clay-500" />
              </button>
            </div>
            <ul className="mt-2 max-h-64 overflow-auto">
              {searching && <li className="px-2 py-2 text-sm text-clay-500">Searching…</li>}
              {!searching && settledQuery === query.trim() && query.trim().length >= 2 && hits.length === 0 && (
                <li className="px-2 py-2 text-sm text-clay-500">No matching records.</li>
              )}
              {hits.map(hit => (
                <li key={hit.id}>
                  <Link
                    href={hit.href}
                    className="block rounded-lg px-2 py-2 hover:bg-cream-100"
                    onClick={() => setSearchOpen(false)}
                  >
                    <span className="block text-sm font-medium text-clay-900">{hit.title}</span>
                    <span className="block text-xs text-clay-500">{hit.subtitle}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-expanded={notesOpen}
          aria-label="Notifications"
          onClick={() => {
            setSearchOpen(false)
            setNotesOpen(open => !open)
          }}
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-accent-coral text-cream-50 text-[10px] font-semibold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
        {notesOpen && (
          <div className="absolute right-0 mt-2 w-80 max-w-[80vw] rounded-xl border border-cream-200 bg-cream-50 shadow-clay-lg p-3 z-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-clay-900">Notifications</p>
              <button type="button" aria-label="Close notifications" onClick={() => setNotesOpen(false)}>
                <X className="w-4 h-4 text-clay-500" />
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-clay-500 px-1 py-2">No notifications yet.</p>
            ) : (
              <ul className="max-h-72 overflow-auto space-y-1">
                {notes.map(note => {
                  const content = (
                    <>
                      <span className="block text-sm font-medium text-clay-900">{note.title}</span>
                      {note.body && <span className="block text-xs text-clay-500 mt-0.5">{note.body}</span>}
                    </>
                  )
                  return (
                    <li key={note.id}>
                      {note.link ? (
                        <Link
                          href={note.link}
                          className="block rounded-lg px-2 py-2 hover:bg-cream-100"
                          onClick={() => {
                            void markRead(note)
                            setNotesOpen(false)
                          }}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="block w-full text-left rounded-lg px-2 py-2 hover:bg-cream-100"
                          onClick={() => void markRead(note)}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}
