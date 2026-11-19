import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Tự động bẻ cache và dọn sạch dữ liệu cũ khi tải trang
if (typeof window !== 'undefined') {
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) caches.delete(name);
    });
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
  const CURRENT_APP_BUILD = 'bookmind-v3-deepcross';
  const savedBuild = localStorage.getItem('__bookmind_build_ver');
  if (savedBuild !== CURRENT_APP_BUILD) {
    localStorage.setItem('__bookmind_build_ver', CURRENT_APP_BUILD);
    localStorage.removeItem('websach-users-v1');
    localStorage.removeItem('websach-users-v2');
    localStorage.removeItem('websach-current-session-v1');
    localStorage.removeItem('websach-current-session-v2');
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
