import type { CSSProperties, ReactNode } from 'react'
import { useReadingMode } from '../../app/ReadingModeProvider'

export function ReadingSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { fontSize, readingWidth, fitWidth } = useReadingMode()
  const widthClass = fitWidth ? 'reading-fit-width' : `reading-width-${readingWidth}`
  return <div className={`reading-document ${widthClass} ${className}`} style={{ '--reading-font-size': `${fontSize}px` } as CSSProperties}>{children}</div>
}
