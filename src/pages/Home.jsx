import { Link } from 'react-router-dom';
import { BookOpen, Code, GraduationCap, ArrowRight } from 'lucide-react';
import { algorithms } from '../data/algorithms';

const sections = [
  {
    title: 'Area Studio',
    to: '/study',
    cta: 'Inizia a studiare',
    icon: BookOpen,
    iconClass: 'text-dracula-green',
    hover: 'hover:border-dracula-cyan',
    link: 'text-dracula-cyan hover:text-dracula-green',
    text: "Leggi le implementazioni C++ di algoritmi come Canny, Harris e Otsu, con spiegazioni interattive, e provale sull'immagine di Lena.",
  },
  {
    title: 'IDE di Pratica',
    to: '/ide',
    cta: 'Inizia a programmare',
    icon: Code,
    iconClass: 'text-dracula-orange',
    hover: 'hover:border-dracula-pink',
    link: 'text-dracula-pink hover:text-dracula-orange',
    text: 'Scrivi il tuo codice C++ in un editor stile VS Code e confrontalo con le implementazioni di riferimento.',
  },
  {
    title: 'Simulazione Esame',
    to: '/exam',
    cta: "Avvia l'esame",
    icon: GraduationCap,
    iconClass: 'text-dracula-pink',
    hover: 'hover:border-dracula-purple',
    link: 'text-dracula-purple hover:text-dracula-pink',
    text: 'Un algoritmo estratto a caso, 90 minuti di tempo e nessuna soluzione a disposizione: come all\'esame vero.',
  },
];

const Home = () => (
  <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-12 text-center">
    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-mono text-dracula-purple mb-6 tracking-tight">
      Master <span className="text-dracula-cyan">Image</span> Processing
    </h1>
    <p className="text-lg md:text-xl text-dracula-comment max-w-2xl mb-12">
      Un hub di studio interattivo per i {algorithms.length} algoritmi fondamentali di elaborazione delle immagini in
      OpenCV C++. Leggi la teoria, provala visivamente nel browser ed esercitati a scrivere il codice.
    </p>

    <div className="grid md:grid-cols-3 gap-6 w-full max-w-6xl">
      {sections.map(({ title, to, cta, icon: Icon, iconClass, hover, link, text }) => (
        <div
          key={to}
          className={`glass p-8 rounded-xl flex flex-col items-start text-left transition-colors ${hover}`}
        >
          <Icon className={`${iconClass} w-12 h-12 mb-4`} aria-hidden="true" />
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-dracula-comment mb-6 flex-grow">{text}</p>
          <Link to={to} className={`flex items-center space-x-2 transition-colors font-medium ${link}`}>
            <span>{cta}</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      ))}
    </div>
  </div>
);

export default Home;
