import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <main className="app-main">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
