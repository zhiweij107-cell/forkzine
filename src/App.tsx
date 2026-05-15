import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { ArticlePage } from '@/pages/ArticlePage'
import { ChatPage } from '@/pages/ChatPage'
import { AuthPage } from '@/pages/AuthPage'
import { GeneratePage } from '@/pages/GeneratePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { TrendingPage } from '@/pages/TrendingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/trending" element={<TrendingPage />} />
        </Route>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/generate" element={<GeneratePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
