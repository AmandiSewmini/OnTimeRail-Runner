import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import DashboardIndex from './dashboard/DashboardIndex';
import TicketManagement from './dashboard/TicketManagement';
import CargoService from './dashboard/CargoService';
import SeasonPassManagement from './dashboard/SeasonPassManagement';
import TrackingSystem from './dashboard/TrackingSystem';
import ComplaintsManagement from './dashboard/ComplaintsManagement';

export default function Dashboard() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardIndex />} />
        <Route path="tickets" element={<TicketManagement />} />
        <Route path="cargo" element={<CargoService />} />
        <Route path="passes" element={<SeasonPassManagement />} />
        <Route path="tracking" element={<TrackingSystem />} />
        <Route path="complaints" element={<ComplaintsManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
} 