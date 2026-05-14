import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PenLine, Search, User, LogOut, ChevronDown, Clock } from 'lucide-react'
import { getCurrentUser, isAuthenticated, logout } from '@/lib/api'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loggedIn = isAuthenticated()
  const user = getCurrentUser()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isHome ? 'bg-transparent' : 'bg-background/80 backdrop-blur-xl border-b border-border/50'
    }`}>
      <nav className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-gold flex items-center justify-center">
            <span className="font-serif font-bold text-primary text-sm">F</span>
          </div>
          <span className={`font-serif font-bold text-xl ${isHome ? 'text-primary-foreground' : 'text-foreground'}`}>
            Forkzine
          </span>
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className={`text-sm font-medium gold-underline ${isHome ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            话题广场
          </Link>
          <Link
            to="/explore"
            className={`text-sm font-medium gold-underline ${isHome ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            发现
          </Link>
          <Link
            to="/trending"
            className={`text-sm font-medium gold-underline ${isHome ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            热门分支
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className={isHome ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10' : ''}>
            <Search className="w-4 h-4" />
          </Button>
          <Link to="/chat">
            <Button variant={isHome ? 'nav-gold' : 'gold'} size="sm" className="gap-2">
              <PenLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">开始对话</span>
            </Button>
          </Link>

          {loggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                  isHome
                    ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-gold">
                    {(user?.name || user?.email || '?')[0].toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline text-sm font-medium max-w-[80px] truncate">
                  {user?.name || user?.email?.split('@')[0] || '用户'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl py-2 animate-fade-in">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium truncate">{user?.name || '用户'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowDropdown(false); navigate('/profile') }}
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      个人中心
                    </button>
                    <button
                      onClick={() => { setShowDropdown(false); navigate('/history') }}
                      className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      对话历史
                    </button>
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      onClick={() => { setShowDropdown(false); logout() }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" size="icon" className={isHome ? 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10' : ''}>
                <User className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
