import { useState } from 'react'
import { Expand, Minimize2, Minus, Plus, Settings2 } from 'lucide-react'
import { useReadingMode } from '../../app/ReadingModeProvider'

export function ReadingToolbar({ title = 'Reading controls' }: { title?: string }) {
  const { focusMode, enterFocus, exitFocus, fontSize, setFontSize, readingWidth, setReadingWidth, fitWidth, setFitWidth } = useReadingMode()
  const [settingsOpen, setSettingsOpen] = useState(false)
  return <div className="reading-toolbar" role="toolbar" aria-label="Reading controls">
    <div className="reading-font-controls" aria-label="Reading font size">
      <button type="button" className="reading-icon-control" aria-label="Decrease reading font size" disabled={fontSize <= 14} onClick={() => setFontSize(fontSize - 1)}><Minus size={16} /></button>
      <span className="reading-font-value" aria-live="polite">{fontSize}px</span>
      <button type="button" className="reading-icon-control" aria-label="Increase reading font size" disabled={fontSize >= 24} onClick={() => setFontSize(fontSize + 1)}><Plus size={16} /></button>
    </div>
    <details className="reading-settings" open={settingsOpen} onToggle={(event) => setSettingsOpen(event.currentTarget.open)}>
      <summary className="reading-control" aria-label="Reading Settings"><Settings2 size={16} /><span>Reading Settings</span></summary>
      <div className="reading-settings-panel" aria-label="Reading Settings">
        <button type="button" className="reading-control" aria-pressed={fitWidth} onClick={() => setFitWidth(!fitWidth)}><Expand size={16} />Fit Width</button>
        <label className="reading-width-control"><span>Reading Width</span><select aria-label="Reading width" value={readingWidth} onChange={(event) => setReadingWidth(event.target.value as typeof readingWidth)}><option value="narrow">Narrow</option><option value="standard">Standard</option><option value="wide">Wide</option></select></label>
      </div>
    </details>
    <button type="button" className="reading-control reading-focus-toggle" aria-pressed={focusMode} aria-label={`${focusMode ? 'Exit Focus' : 'Focus'}: ${title}`} onClick={() => focusMode ? exitFocus() : enterFocus()}>{focusMode ? <Minimize2 size={16} /> : <Expand size={16} />}<span>{focusMode ? 'Exit Focus' : 'Focus'}</span></button>
  </div>
}
