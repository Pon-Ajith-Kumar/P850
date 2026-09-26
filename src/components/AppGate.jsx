import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { verifyPasscode } from '../utils/passcode'

function AppGate({ children }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const ok = await verifyPasscode(input)
    if (!ok) {
      setError('Incorrect passcode. Try again.')
      setInput('')
      return
    }

    setError('')
    setIsUnlocked(true)
    setInput('')
  }

  if (isUnlocked) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-100 via-white to-slate-100 px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-200 bg-white/90 p-6 shadow-2xl shadow-emerald-950/10 backdrop-blur dark:border-emerald-900/60 dark:bg-slate-900/90">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <LockKeyhole size={28} />
          </div>
        </div>

        <div className="mb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-400">Mission Gate CSE</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">P850</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-slate-700 dark:text-slate-200">
            <span className="mb-2 block font-medium">Enter victory passcode</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 pr-11 text-base text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            Resume Learning
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">Protected access</p>
      </div>
    </div>
  )
}

export default AppGate
