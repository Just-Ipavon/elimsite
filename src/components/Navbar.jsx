import { NavLink, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/theme';

const navLinks = [
  { name: 'Studio', path: '/study' },
  { name: 'Pratica', path: '/ide' },
  { name: 'Esame', path: '/exam' },
];

// Marchio: una griglia 3×3 di pixel con un bordo diagonale, come un'immagine elaborata.
const Mark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
    {[0, 1, 2].flatMap((r) =>
      [0, 1, 2].map((c) => (
        <rect
          key={`${r}${c}`}
          x={c * 6}
          y={r * 6}
          width="5"
          height="5"
          rx="1"
          className={c === r ? 'fill-accent' : c > r ? 'fill-ink' : 'fill-line-strong'}
        />
      )),
    )}
  </svg>
);

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  // Studio, Pratica ed Esame usano tutta la larghezza: l'intestazione si allinea a loro.
  const fullWidth = useLocation().pathname !== '/';
  const nextLabel = theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <nav className={`mx-auto flex h-14 ${fullWidth ? '' : 'max-w-page'} items-center gap-3 px-4 sm:gap-6 md:px-6`} aria-label="Navigazione principale">
        <NavLink to="/" className="flex items-center gap-2.5 rounded-sm">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight text-ink">ImageProc</span>
          <span className="hidden font-mono text-2xs text-ink-3 md:inline">OpenCV · C++</span>
        </NavLink>

        <ul className="flex h-full items-stretch sm:gap-2">
          {navLinks.map(({ name, path }) => (
            <li key={path} className="flex">
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `relative flex items-center px-2 text-sm sm:px-2.5 transition-colors ${
                    isActive
                      ? 'text-ink font-medium after:absolute after:inset-x-2 after:-bottom-px sm:after:inset-x-2.5 after:h-0.5 after:bg-accent'
                      : 'text-ink-2 hover:text-ink'
                  }`
                }
              >
                {name}
              </NavLink>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm ml-auto w-8 px-0"
          aria-label={nextLabel}
          title={nextLabel}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
