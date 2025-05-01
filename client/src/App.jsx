import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SimpleChatApp from './SimpleChatApp';
import DiagnosticPage from './tests/DiagnosticPage';

/**
 * App - The main application component
 * Uses React Router to handle different routes
 */
const App = () => {
  return (
    <Router basename="/mini-chatbot">
      <Routes>
        <Route path="/" element={<SimpleChatApp />} />
        <Route path="/diagnostic" element={<DiagnosticPage />} />
      </Routes>
    </Router>
  );
};

export default App;
