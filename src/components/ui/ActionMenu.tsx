import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

type Props = { label: string; children: ReactNode; className?: string }
type Position = { top: number; left: number; mobile: boolean }
const CloseActionMenu = createContext<() => void>(() => undefined)

/** A viewport-aware action menu rendered outside clipping containers. */
export function ActionMenu({ label, children, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const triggerRect = trigger.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const mobile = window.innerWidth <= 420
    const left = Math.max(8, Math.min(triggerRect.right - menuRect.width, window.innerWidth - menuRect.width - 8))
    const below = window.innerHeight - triggerRect.bottom
    const top = below < menuRect.height + 12 ? Math.max(8, triggerRect.top - menuRect.height - 6) : triggerRect.bottom + 6
    setPosition({ top, left, mobile })
  }, [open, children])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const onScroll = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return <>
    <button ref={triggerRef} type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface-elevated)] ${className}`}><MoreVertical size={17} /></button>
    {open && createPortal(<>
      {position?.mobile && <button aria-label="Close actions" className="fixed inset-0 z-[99] bg-[var(--background)]/30" onClick={() => setOpen(false)} />}
      <div ref={menuRef} style={position?.mobile ? { position: 'fixed', left: '50%', bottom: 'max(8px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)', visibility: position ? 'visible' : 'hidden' } : { position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }} className={`z-[100] max-h-[min(70vh,28rem)] w-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] ${position?.mobile ? 'w-[min(24rem,calc(100vw-1rem))] rounded-2xl p-2' : ''}`} role="menu"><CloseActionMenu.Provider value={() => setOpen(false)}>{children}</CloseActionMenu.Provider></div>
    </>, document.body)}
  </>
}

export function ActionMenuItem({ children, onClick, danger = false }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  const close = useContext(CloseActionMenu)
  return <button type="button" role="menuitem" onClick={() => { onClick(); close() }} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-[var(--accent-soft)] dark:hover:bg-[var(--surface-elevated)] ${danger ? 'text-[var(--danger)] dark:text-[var(--danger)]' : 'text-[var(--text-secondary)] dark:text-[var(--text-primary)]'}`}>{children}</button>
}
