import { ConfigProvider } from 'antd';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import { AuthProvider } from './context/AuthContext';
import './global.css';
// Pages
import AdminStats from './pages/admin/AdminStats';
import AdminTasks from './pages/admin/AdminTasks';
import AdminTests from './pages/admin/AdminTests';
import AdminTopics from './pages/admin/AdminTopics';
import AdminUsers from './pages/admin/AdminUsers';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import StudentProgress from './pages/StudentProgress';
import StudentTests from './pages/StudentTests';
import TaskManagement from './pages/TaskManagement';
import TaskSolving from './pages/TaskSolving';
import TeacherStudents from './pages/teacher/TeacherStudents';
import TeacherTests from './pages/teacher/TeacherTests';
import TestAssignment from './pages/TestAssignment';
import TestConstructor from './pages/TestConstructor';
import TestTaking from './pages/TestTaking';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  return (

    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#faad14',
          colorPrimaryHover: '#d48806',
          colorPrimaryActive: '#ad6800',
          colorTextBase: '#1c2b33',
          borderRadius: 6,
          colorLink: '#faad14',
          colorLinkHover: '#d48806',
        },
      }}
    >
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <div className="main-layout">
            <Sidebar />
            <div className="content-wrapper">
            <main className="content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />

                {/* STUDENT ROUTES */}
                <Route path="/student/topics" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/student/tests" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentTests />
                  </ProtectedRoute>
                } />
                <Route path="/student/progress" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <StudentProgress />
                  </ProtectedRoute>
                } />
                <Route path="/student/test/:sessionId" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <TestTaking />
                  </ProtectedRoute>
                } />
                <Route path="/student/task/:taskId" element={
                  <ProtectedRoute roles={['STUDENT']}>
                    <TaskSolving />
                  </ProtectedRoute>
                } />

                {/* TEACHER ROUTES */}
                <Route path="/teacher/students" element={
                  <ProtectedRoute roles={['TEACHER']}>
                    <TeacherStudents />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/tests" element={
                  <ProtectedRoute roles={['TEACHER']}>
                    <TeacherTests />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/tasks" element={
                  <ProtectedRoute roles={['TEACHER', 'ADMIN']}>
                    <TaskManagement />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/tests/new" element={
                  <ProtectedRoute roles={['TEACHER']}>
                    <TestConstructor />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/tests/:testId/edit" element={
                  <ProtectedRoute roles={['TEACHER']}>
                    <TestConstructor />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/tests/assign" element={
                  <ProtectedRoute roles={['TEACHER']}>
                    <TestAssignment />
                  </ProtectedRoute>
                } />

                {/* ADMIN ROUTES */}
                <Route path="/admin/users" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminUsers />
                  </ProtectedRoute>
                } />
                <Route path="/admin/topics" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminTopics />
                  </ProtectedRoute>
                } />
                <Route path="/admin/tasks" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminTasks />
                  </ProtectedRoute>
                } />
                <Route path="/admin/tests" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminTests />
                  </ProtectedRoute>
                } />
                <Route path="/admin/stats" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminStats />
                  </ProtectedRoute>
                } />
              </Routes>
            </main>
            
            </div>
          </div>
          <Footer />
        </div>
        
      </Router>
    </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
