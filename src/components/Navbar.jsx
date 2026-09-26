import { BookOpen, FileCheck2, Menu, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

function Navbar({ title, onMenuToggle }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMenuToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Menu size={18} />
          </button>

          <Link to="/" className="flex min-w-0 items-center gap-2 transition hover:opacity-90">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">P850</p>
              <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">{title}</h1>
            </div>
          </Link>
        </div>

        <div className="hidden flex-1 items-center justify-center px-4 md:flex">
          <label className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search notes"
              placeholder="Search subjects, topics..."
              className="w-full border-0 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-200 dark:placeholder-slate-500"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/test-analyzer"
            aria-label="Open Test Analyzer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500 bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <FileCheck2 size={18} />
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Navbar
