import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import { login, register } from '@/lib/api'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await register(email, password, name)
        setSuccess('注册成功！正在跳转...')
        setTimeout(() => navigate('/'), 1000)
      } else {
        await login(email, password)
        setSuccess('登录成功！正在跳转...')
        setTimeout(() => navigate('/'), 500)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败，请重试'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-gold/5 blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 w-48 h-48 rounded-full bg-gold/8 blur-2xl" />
        </div>
        <div className="relative z-10 max-w-md px-12">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center">
              <span className="font-serif font-bold text-primary text-lg">F</span>
            </div>
            <span className="font-serif font-bold text-2xl text-primary-foreground">Forkzine</span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-primary-foreground mb-4">
            对话即创作<br />观点即分叉
          </h2>
          <p className="text-primary-foreground/60 leading-relaxed">
            与 AI 深度对话，自动生成精美杂志访谈文章。
            在任意观点处创建分支，让思想在碰撞中生长。
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-md bg-gold flex items-center justify-center">
              <span className="font-serif font-bold text-primary text-sm">F</span>
            </div>
            <span className="font-serif font-bold text-xl">Forkzine</span>
          </div>

          <h1 className="text-2xl font-serif font-bold mb-2">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === 'login' ? '登录以继续你的创作之旅' : '加入 Forkzine，开始你的第一次深度对话'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="你的笔名"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="邮箱地址"
                required
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码（至少6位）"
                required
                minLength={6}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50 transition-all"
              />
            </div>

            <Button type="submit" variant="gold" className="w-full h-11 gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? '登录' : '注册'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">或</span>
            </div>
          </div>

          {/* Quick guest access */}
          <Button
            variant="outline"
            className="w-full h-11 gap-2"
            onClick={() => navigate('/chat')}
          >
            <Sparkles className="w-4 h-4 text-gold" />
            快速体验（免注册）
          </Button>

          {/* Switch mode */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? (
              <>还没有账号？ <button onClick={() => { setMode('register'); setError('') }} className="text-gold font-medium hover:underline">立即注册</button></>
            ) : (
              <>已有账号？ <button onClick={() => { setMode('login'); setError('') }} className="text-gold font-medium hover:underline">登录</button></>
            )}
          </p>

          {/* Back to home */}
          <div className="text-center mt-4">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
