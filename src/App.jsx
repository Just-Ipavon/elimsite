import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StudyArea from './pages/StudyArea';
import IdeArea from './pages/IdeArea';

function App() {
  return (
    <div className="min-h-screen bg-dracula-bg flex flex-col font-sans">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<StudyArea />} />
          <Route path="/ide" element={<IdeArea />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
