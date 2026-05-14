import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

export const authRouter = Router()

/**
 * POST /api/auth/register
 * Register a new user via Supabase Auth
 */
authRouter.post('/register', async (req, res) => {
  const { email, password, name } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name: name || email.split('@')[0] },
    email_confirm: true,
  })

  if (error) {
    res.status(400).json({ error: error.message })
    return
  }

  // Also create a profile in our profiles table
  await supabaseAdmin.from('profiles').insert({
    id: data.user.id,
    name: name || email.split('@')[0],
    email,
    title: '内容创作者',
  })

  // Sign in immediately
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    res.status(400).json({ error: signInError.message })
    return
  }

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name,
    },
    session: {
      access_token: signInData.session?.access_token,
      refresh_token: signInData.session?.refresh_token,
    },
  })
})

/**
 * POST /api/auth/login
 * Login with email and password
 */
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    res.status(401).json({ error: error.message })
    return
  }

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || data.user.user_metadata?.name,
      title: profile?.title,
      avatar_url: profile?.avatar_url,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
})

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
authRouter.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body

  if (!refresh_token) {
    res.status(400).json({ error: 'Refresh token is required' })
    return
  }

  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token,
  })

  if (error) {
    res.status(401).json({ error: error.message })
    return
  }

  res.json({
    session: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    },
  })
})

/**
 * GET /api/auth/me
 * Get current user profile
 */
authRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  res.json({
    id: user.id,
    email: user.email,
    name: profile?.name || user.user_metadata?.name,
    title: profile?.title,
    avatar_url: profile?.avatar_url,
  })
})
