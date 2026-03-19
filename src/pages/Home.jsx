import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Code, ArrowRight } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-5xl md:text-7xl font-bold font-mono text-dracula-purple mb-6 tracking-tight">
        Master <span className="text-dracula-cyan">Image</span> Processing
      </h1>
      <p className="text-lg md:text-xl text-dracula-comment max-w-2xl mb-12">
        An interactive study hub for the 9 core OpenCV C++ algorithms. Read the theory, test it visually in your browser, and practice writing the code.
      </p>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        <div className="glass p-8 rounded-xl flex flex-col items-start text-left hover:border-dracula-cyan transition-colors">
          <BookOpen className="text-dracula-green w-12 h-12 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Study Area</h2>
          <p className="text-dracula-comment mb-6 flex-grow">
            Read through the C++ implementations of algorithms like Canny, Harris, and Otsu. Test them interactively with the Lena image.
          </p>
          <Link to="/study" className="flex items-center space-x-2 text-dracula-cyan hover:text-dracula-green transition-colors font-medium">
            <span>Start studying</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="glass p-8 rounded-xl flex flex-col items-start text-left hover:border-dracula-pink transition-colors">
          <Code className="text-dracula-orange w-12 h-12 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Practice IDE</h2>
          <p className="text-dracula-comment mb-6 flex-grow">
            Write your C++ code in a VSCode-like environment. Verify and compare your implementation against the reference algorithms.
          </p>
          <Link to="/ide" className="flex items-center space-x-2 text-dracula-pink hover:text-dracula-orange transition-colors font-medium">
            <span>Start coding</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
