import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import QA from './pages/QA'
import ChapterDetail from './pages/ChapterDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/qa" element={<QA />} />
      <Route path="/chapter/:chapterId" element={<ChapterDetail />} />
    </Routes>
  )
}
