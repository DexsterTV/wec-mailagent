import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}
