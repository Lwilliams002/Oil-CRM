import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard'
import NewPatient from './pages/NewPatient'
import AllPatients from './pages/AllPatients'
import NewAppointment from './pages/NewAppointment'
import PatientDetails from './pages/PatientDetails'
import Consent from './pages/Consent'
import Terms from './pages/Terms'
import Login from './pages/Login'
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              {/* Rendered by nested routes */}
              <Outlet />
            </Layout>
          </ProtectedRoute>
        }
      >
        {/* Dashboard at root */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients/new" element={<NewPatient />} />
        <Route path="patients" element={<AllPatients />} />
        <Route path="appointments/new" element={<NewAppointment />} />
        <Route path="patient-details/:id" element={<PatientDetails />} />
        <Route path="consent/:id" element={<Consent />} />
        <Route path="terms/:id" element={<Terms />} />
        {/* Add more nested routes here */}
      </Route>
      {/* Fallback for unknown paths */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
