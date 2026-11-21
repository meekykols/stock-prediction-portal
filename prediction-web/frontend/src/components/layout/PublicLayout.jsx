import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AnnouncementBar from './AnnouncementBar';
import { useTheme } from '../../hooks/useTheme';

export default function PublicLayout() {
  const theme = useTheme();
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <AnnouncementBar />
      <Navbar theme={theme} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer isDark={theme.isDark} />
    </div>
  );
}
