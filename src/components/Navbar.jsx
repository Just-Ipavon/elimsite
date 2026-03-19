import { Link, useLocation } from 'react-router-dom';
import { Home, Code, BookOpen } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Study Area', path: '/study', icon: BookOpen },
    { name: 'Practice IDE', path: '/ide', icon: Code },
    { name: 'Exam Sim', path: '/exam', icon: BookOpen },
  ];

  return (
    <nav className="glass sticky top-0 z-50 text-dracula-fg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold font-mono text-dracula-purple">ImageProc</span>
            <span className="text-sm text-dracula-comment hidden sm:inline-block">OpenCV C++ Study Hub</span>
          </div>
          <div className="flex space-x-1 sm:space-x-4">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-dracula-purple bg-opacity-20 text-dracula-purple' 
                      : 'hover:bg-dracula-current hover:text-dracula-cyan'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline-block">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
