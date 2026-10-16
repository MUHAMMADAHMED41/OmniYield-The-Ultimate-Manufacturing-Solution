import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";

export default function Navbar({ darkMode, setDarkMode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, []);

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <span className="brand-mark">⬡</span>
        <span className="brand-name">OmniYield</span>
      </Link>

      <div className={`nav-links ${open ? "nav-links-open" : ""}`}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Overview
        </NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          How It Works
        </NavLink>
        <NavLink to="/diagnose" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
          Diagnostic Console
        </NavLink>
      </div>

      <div className="nav-actions">
        <button className="theme-toggle" onClick={() => setDarkMode((d) => !d)}>
          {darkMode ? "☀ Light" : "● Dark"}
        </button>
        <Link to="/diagnose" className="pill-btn pill-btn-filled">
          Launch Console
        </Link>
        <button className="nav-burger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          ☰
        </button>
      </div>
    </nav>
  );
}
