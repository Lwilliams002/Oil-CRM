import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
      <Route
        path="/*"
        element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element= {<Dashboard />}/>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients/new" element={<NewPatient />} />
              <Route path="/patients" element={<AllPatients />} />
              <Route path="/appointments/new" element={<NewAppointment />} />
              <Route path="/patient-details/:id" element={<PatientDetails />} />
              <Route path="/consent/:id" element={<Consent />} />
              <Route path="/terms/:id" element={<Terms />} />
              {/* Add more routes here as needed */}
            </Routes>
          </Layout>
        </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
