import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppGate from './components/AppGate'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Bookmarks from './pages/Bookmarks'
import Mistakes from './pages/Mistakes'
import SubjectPage from './pages/SubjectPage'
import Subjects from './pages/Subjects'
import TestAnalyzer from './pages/TestAnalyzer'
import TopicPage from './pages/TopicPage'

function AppLayout({ darkMode, onToggleTheme, mobileOpen, setMobileOpen, children }) {
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen overflow-x-hidden bg-[#f0fdf4] text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto flex max-w-[1600px] overflow-x-hidden">
          <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

          <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
            <Navbar
              title="MISSION GATE CSE"
              onMenuToggle={() => setMobileOpen((prev) => !prev)}
              darkMode={darkMode}
              onToggleTheme={onToggleTheme}
            />
            <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <BrowserRouter>
      <AppGate>
        <AppLayout darkMode={darkMode} onToggleTheme={() => setDarkMode((prev) => !prev)} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>
          <Routes>
            <Route path="/" element={<Subjects />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/:subjectId" element={<SubjectPage />} />
            <Route path="/subjects/:subjectId/:topicId" element={<TopicPage />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/mistakes" element={<Mistakes />} />
            <Route path="/test-analyzer" element={<TestAnalyzer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </AppGate>
    </BrowserRouter>
  )
}

export default App
