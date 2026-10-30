import { BookOpen, ChevronDown, FolderPlus, HardDrive, Menu, Moon, NotebookPen, Plus, Settings, Star, Sun, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../app/ThemeProvider'
import { ReadingModeProvider, useReadingMode } from '../../app/ReadingModeProvider'

const nav = [
  { label: 'My Drive', to: '/', icon: HardDrive },
  { label: 'Favourites', to: '/answers?favourite=true', icon: Star },
  { label: 'Quick Notes', to: '/notes', icon: NotebookPen },
  { label: 'Settings', to: '/settings', icon: Settings },
]

const navItemBase = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition'
const navItemActive = 'bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent)]'
const navItemIdle = 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]'

export function AppShell({ children }: { children: ReactNode }) {
  return <ReadingModeProvider><AppShellLayout>{children}</AppShellLayout></ReadingModeProvider>
}

function AppShellLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const newMenuRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()
  const { focusMode } = useReadingMode()
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const createAnswerPath = () => { const folder = params.get('folder'); navigate(`/answers/new${folder ? `?folder=${folder}` : ''}`) }
  const openNewFolder = () => {
    const route = location.pathname.startsWith('/notes') ? '/notes' : '/'
    const folder = params.get('folder')
    const next = new URLSearchParams(route === location.pathname ? location.search : '')
    if (folder) next.set('folder', folder)
    next.set('newFolder', '1')
    navigate(`${route}?${next.toString()}`)
    setNewMenuOpen(false)
  }
  useEffect(() => {
    if (!newMenuOpen) return
    const closeOutside = (event: PointerEvent) => { if (!newMenuRef.current?.contains(event.target as Node)) setNewMenuOpen(false) }
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNewMenuOpen(false) }
    document.addEventListener('pointerdown', closeOutside, true); document.addEventListener('keydown', closeEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside, true); document.removeEventListener('keydown', closeEscape) }
  }, [newMenuOpen])
  useEffect(() => { setNewMenuOpen(false) }, [location.pathname, location.search])
  const isActive = (to: string) => {
    const state = location.state as { originSection?: string } | null
    const answerDetail = /^\/answers\/[^/]+$/.test(location.pathname)
    if (to === '/') return (location.pathname === '/' && state?.originSection !== 'favourites') || (answerDetail && state?.originSection !== 'favourites' && state?.originSection !== 'quickNotes') || (location.pathname === '/answers' && params.get('favourite') !== 'true' && !params.has('subject'))
    if (to === '/settings') return location.pathname === '/settings'
    if (to.includes('favourite=true')) return (location.pathname === '/answers' && params.get('favourite') === 'true') || state?.originSection === 'favourites'
    if (to === '/notes') return ((location.pathname === '/notes' || location.pathname.startsWith('/notes/')) && state?.originSection !== 'favourites') || (answerDetail && state?.originSection === 'quickNotes')
    if (to.includes('subject=')) return location.pathname === '/answers' && params.get('subject') === to.split('subject=')[1]
    return false
  }

  return <div id="app-shell" className={`min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--text-primary)] ${focusMode ? 'reading-focus-shell' : ''}`}>
    {!focusMode && open && <button className="fixed inset-0 z-30 bg-[var(--overlay)]/50 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    {!focusMode && <aside className={`fixed inset-y-0 left-0 z-40 w-[min(17rem,85vw)] border-r border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-xl transition-transform dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--text-primary)] lg:w-60 lg:shadow-none lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-8 flex items-center justify-between px-2 py-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent)] text-[var(--accent-contrast)] shadow-md shadow-[var(--accent)]/30"><BookOpen size={21} /></span>
            <span><strong className="block text-sm">NABARD</strong><span className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Answer Bank</span></span>
          </button>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <nav className="space-y-1">
          {nav.map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} onClick={() => setOpen(false)} className={() => `${navItemBase} ${isActive(to) ? navItemActive : navItemIdle}`}><Icon size={18} />{label}</NavLink>)}
        </nav>
        <div className="mt-auto space-y-2">
          <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} {theme === 'light' ? 'Dark mode' : 'Light mode'}</button>
        </div>
      </div>
    </aside>}

    <div className={focusMode ? 'min-h-screen' : 'lg:pl-60'}>
      {!focusMode && <header className="sticky top-0 z-20 border-b border-[var(--border)]/90 bg-[var(--background)]/95 backdrop-blur dark:border-[var(--border)] dark:bg-[var(--background)]/95">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="rounded-lg p-2 hover:bg-[var(--accent-soft)] dark:hover:bg-[var(--surface)] lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="min-w-0 flex-1 text-sm font-medium text-[var(--text-secondary)]">NABARD <span className="text-[var(--border)]">/</span> Study Workspace</div>
          <div className="relative" ref={newMenuRef}><button onClick={() => setNewMenuOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm hover:bg-[var(--accent-hover)] sm:px-4"><Plus size={18} /><span>New</span><ChevronDown size={15} /></button>{newMenuOpen && <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"><button onClick={openNewFolder} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-[var(--accent-soft)]"><FolderPlus size={16} />New Folder</button><button onClick={() => { setNewMenuOpen(false); createAnswerPath() }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-[var(--accent-soft)]"><Plus size={16} />New Answer</button><button onClick={() => { setNewMenuOpen(false); const folder = params.get('folder'); navigate(`/notes/new${folder ? `?folder=${folder}` : ''}`) }} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-[var(--accent-soft)]"><NotebookPen size={16} />New Note</button></div>}</div>
          <button onClick={toggleTheme} className="rounded-xl p-2.5 hover:bg-[var(--accent-soft)] dark:hover:bg-[var(--surface)]" aria-label="Toggle theme">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
        </div>
      </header>}
      <main className={focusMode ? 'mx-auto min-h-screen w-full max-w-none px-3 py-3 pb-8 sm:px-5 sm:py-4 md:px-8' : 'mx-auto max-w-screen-2xl px-4 py-5 pb-24 sm:px-6 sm:py-7 sm:pb-8 lg:px-8'}>{children}</main>
      {!focusMode && <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pt-2 text-[11px] font-medium text-[var(--text-muted)] backdrop-blur dark:border-[var(--border)] dark:bg-[var(--surface)]/95 dark:text-[var(--text-muted)] sm:hidden" aria-label="Mobile navigation">
        {[{ label: 'My Drive', to: '/', icon: HardDrive }, { label: 'Favourites', to: '/answers?favourite=true', icon: Star }, { label: 'Quick Notes', to: '/notes', icon: NotebookPen }, { label: 'Settings', to: '/settings', icon: Settings }].map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} className={() => `flex min-h-12 flex-col items-center justify-center gap-1 ${isActive(to) || (to === '/notes' && location.pathname.startsWith('/notes')) ? 'text-[var(--accent)] dark:text-[var(--accent)]' : ''}`}><Icon size={18} /><span className="truncate">{label}</span></NavLink>)}
      </nav>}
    </div>
  </div>
}
