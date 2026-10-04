import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StudyArea from './pages/StudyArea';
import IdeArea from './pages/IdeArea';
import ExamArea from './pages/ExamArea';

// Ogni pagina si apre dall'inizio, non alla posizione di scorrimento della precedente.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Vai al contenuto
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main" className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<StudyArea />} />
          <Route path="/ide" element={<IdeArea />} />
          <Route path="/exam" element={<ExamArea />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
