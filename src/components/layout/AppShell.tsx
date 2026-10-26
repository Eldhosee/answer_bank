import { BookOpen, FileText, Home, Menu, Moon, NotebookPen, Plus, Settings, Star, Sun, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../app/ThemeProvider'

const nav = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'All Answers', to: '/answers', icon: FileText },
  { label: 'ARD', to: '/answers?subject=ARD', icon: BookOpen },
  { label: 'ESI', to: '/answers?subject=ESI', icon: BookOpen },
  { label: 'English', to: '/answers?subject=English', icon: BookOpen },
]

const navItemBase = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition'
const navItemActive = 'bg-[#ece6ff] text-[#5530e6] dark:bg-[#2f2658] dark:text-[#b8a6ff]'
const navItemIdle = 'text-[#4f4870] hover:bg-[#f1ecff] dark:text-[#c3bce0] dark:hover:bg-[#272046]'

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    if (to.includes('favourite=true')) return location.pathname === '/answers' && params.get('favourite') === 'true'
    if (to.includes('subject=')) return location.pathname === '/answers' && params.get('subject') === to.split('subject=')[1]
    return location.pathname === '/answers' && !params.has('subject') && params.get('favourite') !== 'true'
  }

  return <div className="min-h-screen overflow-x-hidden bg-[#f8f5ff] text-[#1b1534] dark:bg-[#130f24] dark:text-[#f4f1ff]">
    {open && <button className="fixed inset-0 z-30 bg-[#130f24]/50 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 w-[min(17rem,85vw)] border-r border-[#e4dcf7] bg-white text-[#1b1534] shadow-xl transition-transform dark:border-[#352d5c] dark:bg-[#1d1735] dark:text-[#f4f1ff] lg:w-60 lg:shadow-none lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-8 flex items-center justify-between px-2 py-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#6d4aff] to-[#9d85ff] text-white shadow-md shadow-[#6d4aff]/30"><BookOpen size={21} /></span>
            <span><strong className="block text-sm">NABARD</strong><span className="text-sm text-[#8a84a6] dark:text-[#8f87b3]">Answer Bank</span></span>
          </button>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <nav className="space-y-1">
          {nav.map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} onClick={() => setOpen(false)} className={() => `${navItemBase} ${isActive(to) ? navItemActive : navItemIdle}`}><Icon size={18} />{label}</NavLink>)}
          <NavLink to="/answers?favourite=true" onClick={() => setOpen(false)} className={() => `${navItemBase} ${isActive('/answers?favourite=true') ? navItemActive : navItemIdle}`}><Star size={18} />Favourites</NavLink>
          <NavLink to="/notes" onClick={() => setOpen(false)} className={() => `${navItemBase} ${location.pathname.startsWith('/notes') ? navItemActive : navItemIdle}`}><NotebookPen size={18} />Quick Notes</NavLink>
        </nav>
        <div className="mt-auto space-y-2">
          <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#4f4870] hover:bg-[#f1ecff] dark:text-[#c3bce0] dark:hover:bg-[#272046]">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} {theme === 'light' ? 'Dark mode' : 'Light mode'}</button>
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-[#8a84a6] dark:text-[#8f87b3]"><Settings size={18} />Settings</div>
        </div>
      </div>
    </aside>

    <div className="lg:pl-60">
      <header className="sticky top-0 z-20 border-b border-[#e4dcf7]/90 bg-[#f8f5ff]/95 backdrop-blur dark:border-[#352d5c] dark:bg-[#130f24]/95">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="rounded-lg p-2 hover:bg-[#ece6ff] dark:hover:bg-[#272046] lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="min-w-0 flex-1 text-sm font-medium text-[#8a84a6] dark:text-[#8f87b3]">Study notebook <span className="text-[#cfc6ee] dark:text-[#4a3f7a]">/</span> NABARD</div>
          <button onClick={() => navigate('/answers/new')} className="hidden min-h-10 items-center gap-2 rounded-xl bg-[#6d4aff] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#6d4aff]/25 hover:bg-[#5530e6] sm:flex dark:bg-[#9d85ff] dark:text-[#130f24] dark:shadow-none dark:hover:bg-[#b8a6ff]"><Plus size={18} />Add Answer</button>
          <button onClick={toggleTheme} className="rounded-xl p-2.5 hover:bg-[#ece6ff] dark:hover:bg-[#272046]" aria-label="Toggle theme">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 pb-24 sm:px-6 sm:py-7 sm:pb-8 lg:px-8">{children}</main>
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[#e4dcf7] bg-white/95 px-2 pt-2 text-[11px] font-medium text-[#8a84a6] backdrop-blur dark:border-[#352d5c] dark:bg-[#1d1735]/95 dark:text-[#8f87b3] sm:hidden" aria-label="Mobile navigation">
        {[{ label: 'Home', to: '/', icon: Home }, { label: 'Answers', to: '/answers', icon: FileText }, { label: 'Favourites', to: '/answers?favourite=true', icon: Star }, { label: 'Notes', to: '/notes', icon: NotebookPen }, { label: 'Add', to: '/answers/new', icon: Plus }].map(({ label, to, icon: Icon }) => <NavLink key={label} to={to} className={() => `flex min-h-12 flex-col items-center justify-center gap-1 ${isActive(to) || (to === '/answers/new' && location.pathname === '/answers/new') || (to === '/notes' && location.pathname.startsWith('/notes')) ? 'text-[#6d4aff] dark:text-[#b8a6ff]' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
      </nav>
    </div>
  </div>
}
