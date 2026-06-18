import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import CourseList from './pages/CourseList'
import Settings from './pages/Settings'
import Exercise from './pages/Exercise'
import Course from './pages/Course'
import Stats from './pages/Stats'
import CourseMap from './pages/CourseMap'
import Cheatsheets from './pages/Cheatsheets'
import Roadmap from './pages/Roadmap'
import Flashcards from './pages/Flashcards'
import Sandbox from './pages/Sandbox'
import Missions from './pages/Missions'
import MissionPlay from './pages/MissionPlay'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/course/:lang/:level/:moduleId" element={<Course />} />
      <Route path="/exercise/:lang/:level/:moduleId/:exerciseIndex" element={<Exercise />} />
      {/* Mode jeu : l'écran de jeu est en plein écran (hors AppLayout), comme les
          exercices, pour une immersion sans barre latérale. */}
      <Route path="/mission/:campaignId" element={<MissionPlay />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<CourseList />} />
        <Route path="missions" element={<Missions />} />
        <Route path="map" element={<CourseMap />} />
        <Route path="stats" element={<Stats />} />
        <Route path="cheatsheets" element={<Cheatsheets />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="sandbox" element={<Sandbox />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
