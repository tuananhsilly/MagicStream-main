import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider.jsx';
import { WatchlistProvider } from './context/WatchlistProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <WatchlistProvider>
      <BrowserRouter>
        <Routes>
          <Route path ="/*" element ={<App/>} />
        </Routes>
      </BrowserRouter>
      </WatchlistProvider>
    </AuthProvider>
  </StrictMode>,
)
