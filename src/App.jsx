import { Navigate, Route, Routes } from 'react-router-dom'
import { homeFor, useAuth } from './auth/AuthProvider.jsx'
import RequireRole from './auth/RequireRole.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import { Spinner } from './components/ui/Feedback.jsx'
import { ForgotPassword, Login, ResetPassword } from './pages/auth/AuthPages.jsx'
import CandidateDashboard from './pages/candidate/Dashboard.jsx'
import RegisterAttendance from './pages/candidate/RegisterAttendance.jsx'
import MyAttendance from './pages/candidate/AttendanceHistory.jsx'
import MyWfh from './pages/candidate/WfhRequests.jsx'
import MentorDashboard from './pages/mentor/Dashboard.jsx'
import MentorAttendance from './pages/mentor/Attendance.jsx'
import MentorWfh from './pages/mentor/WfhRequests.jsx'
import Candidates from './pages/mentor/Candidates.jsx'
import Profile from './pages/Profile.jsx'
import { NotFound, Unauthorized } from './pages/StatusPages.jsx'

function Home() {
  const { session, profile, loading, recovery } = useAuth()
  if (recovery) return <Navigate to="/reset-password" replace />
  if (loading) return <div className="grid min-h-dvh place-items-center"><Spinner /></div>
  return <Navigate to={session && profile ? homeFor(profile) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<RequireRole role="candidate" />}>
        <Route path="/candidate" element={<AppLayout />}>
          <Route index element={<CandidateDashboard />} />
          <Route path="register" element={<RegisterAttendance />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="wfh" element={<MyWfh />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="mentor" />}>
        <Route path="/mentor" element={<AppLayout />}>
          <Route index element={<MentorDashboard />} />
          <Route path="attendance" element={<MentorAttendance />} />
          <Route path="wfh" element={<MentorWfh />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
