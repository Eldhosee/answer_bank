import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AnswersPage } from '../features/answers/pages/AnswersPage'
import { AddAnswerPage } from '../features/answers/pages/AddAnswerPage'
import { AnswerDetailPage } from '../features/answers/pages/AnswerDetailPage'
import { NoteEditorPage } from '../features/notes/pages/NoteEditorPage'
import { NoteDetailPage } from '../features/notes/pages/NoteDetailPage'
import { DrivePage } from '../features/drive/pages/DrivePage'
import { SettingsPage } from './SettingsPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DrivePage />} />
        <Route path="/answers" element={<AnswersPage />} />
        <Route path="/answers/new" element={<AddAnswerPage />} />
        <Route path="/answers/:id/edit" element={<AddAnswerPage />} />
        <Route path="/answers/:id" element={<AnswerDetailPage />} />
        <Route path="/notes" element={<DrivePage notesOnly />} />
        <Route path="/notes/new" element={<NoteEditorPage />} />
        <Route path="/notes/:id/edit" element={<NoteEditorPage />} />
        <Route path="/notes/:id" element={<NoteDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
