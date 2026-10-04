import { NavLink } from 'react-router-dom';
import { Home, Code, BookOpen, GraduationCap } from 'lucide-react';

const navLinks = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Studio', path: '/study', icon: BookOpen },
  { name: 'IDE', path: '/ide', icon: Code },
  { name: 'Esame', path: '/exam', icon: GraduationCap },
];

const Navbar = () => (
  <nav className="glass sticky top-0 z-50 text-dracula-fg" aria-label="Navigazione principale">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <NavLink to="/" className="flex items-center space-x-3">
          <span className="text-xl font-bold font-mono text-dracula-purple">ImageProc</span>
          <span className="text-sm text-dracula-comment hidden md:inline-block">OpenCV C++ Study Hub</span>
        </NavLink>
        <div className="flex space-x-1 sm:space-x-2">
          {navLinks.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end
              aria-label={name}
              className={({ isActive }) =>
                `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-dracula-purple ${
                  isActive
                    ? 'bg-dracula-purple bg-opacity-20 text-dracula-purple'
                    : 'hover:bg-dracula-current hover:text-dracula-cyan'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span className="hidden sm:inline-block">{name}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  </nav>
);

export default Navbar;
