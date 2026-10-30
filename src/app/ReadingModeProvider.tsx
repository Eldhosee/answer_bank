import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type ReadingWidth = 'narrow' | 'standard' | 'wide'

type ReadingContextValue = {
  focusMode: boolean
  fontSize: number
  readingWidth: ReadingWidth
  fitWidth: boolean
  enterFocus: () => void
  exitFocus: () => void
  setFontSize: (value: number) => void
  setReadingWidth: (value: ReadingWidth) => void
  setFitWidth: (value: boolean) => void
}

const ReadingContext = createContext<ReadingContextValue | null>(null)
const FONT_KEY = 'nabard-reading-font-size'
const WIDTH_KEY = 'nabard-reading-width'

function initialFontSize() {
  const stored = Number(localStorage.getItem(FONT_KEY))
  return Number.isFinite(stored) && stored >= 14 && stored <= 24 ? stored : 18
}

function initialWidth(): ReadingWidth {
  const stored = localStorage.getItem(WIDTH_KEY)
  return stored === 'narrow' || stored === 'wide' ? stored : 'standard'
}

export function ReadingModeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false)
  const [fontSize, setFontSizeState] = useState(initialFontSize)
  const [readingWidth, setReadingWidthState] = useState<ReadingWidth>(initialWidth)
  const [fitWidth, setFitWidth] = useState(false)
  const scrollPosition = useRef<number | null>(null)

  const setFontSize = useCallback((value: number) => setFontSizeState(Math.min(24, Math.max(14, value))), [])
  const setReadingWidth = useCallback((value: ReadingWidth) => setReadingWidthState(value), [])

  const enterFocus = useCallback(() => {
    scrollPosition.current = window.scrollY
    setFocusMode(true)
    const shell = document.getElementById('app-shell')
    if (!document.fullscreenElement && shell?.requestFullscreen) {
      void shell.requestFullscreen().catch(() => undefined)
    }
  }, [])

  const exitFocus = useCallback(() => {
    scrollPosition.current = window.scrollY
    setFocusMode(false)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }, [])

  useLayoutEffect(() => {
    if (scrollPosition.current === null) return
    const position = scrollPosition.current
    scrollPosition.current = null
    requestAnimationFrame(() => window.scrollTo(0, position))
  }, [focusMode])

  useEffect(() => {
    localStorage.setItem(FONT_KEY, String(fontSize))
    localStorage.setItem(WIDTH_KEY, readingWidth)
  }, [fontSize, readingWidth])

  useEffect(() => {
    if (!focusMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitFocus()
    }
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        scrollPosition.current = window.scrollY
        setFocusMode(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [focusMode, exitFocus])

  const value = useMemo(() => ({ focusMode, fontSize, readingWidth, fitWidth, enterFocus, exitFocus, setFontSize, setReadingWidth, setFitWidth }), [focusMode, fontSize, readingWidth, fitWidth, enterFocus, exitFocus, setFontSize, setReadingWidth])
  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>
}

export function useReadingMode() {
  const context = useContext(ReadingContext)
  if (!context) throw new Error('useReadingMode must be used inside ReadingModeProvider')
  return context
}
