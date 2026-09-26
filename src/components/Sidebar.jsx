import { AlertTriangle, Bookmark, BookOpenText, LibraryBig, NotebookPen } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Subjects', icon: LibraryBig },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/mistakes', label: 'Mistakes', icon: AlertTriangle },
  { to: '/test-analyzer', label: 'Test Analyzer', icon: NotebookPen },
]

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-slate-100/95 p-5 backdrop-blur-sm transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900/95 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <BookOpenText size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">P850</p>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">MISSION GATE CSE</h2>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}
    </>
  )
}

export default Sidebar
