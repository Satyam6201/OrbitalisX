import React, { useState, useEffect } from "react";
import "../styles/landing-page.css";
import { motion } from "framer-motion";
import { FaRocket, FaGlobeAmericas, FaSun, FaMoon, FaSatellite } from "react-icons/fa";

export default function Home() {
  const [darkMode, setDarkMode] = useState(true);

  // Toggle dark/light mode and store preference in localStorage
  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  return (
    <div className={`landing-container ${darkMode ? "dark-mode" : "light-mode"}`}>
      <nav className="navbar">
        <div className="logo">Space Explorer</div>
        <ul className="nav-links">
          <li>
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle Dark/Light Mode"
              className="mode-toggle"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </li>
        </ul>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="hero"
      >
        <h2>Explore the Universe</h2>
        <p>Embark on an interstellar adventure with us and learn more about space, satellites, and the cosmos.</p>
        <div className="button-container">
          <a className="orbit-button" href="/orbit.html">
            <FaGlobeAmericas /> View Earth Orbit
          </a>
          <a className="orbit-button" href="/solar-system.html">
            <FaSun /> View Solar System
          </a>
          <a className="orbit-button" href="/satellite-tracker.html">
            <FaSatellite /> Track Satellites
          </a>
        </div>
      </motion.div>

      <section className="features">
        <h2>Features</h2>
        <div className="feature-list">
          <div className="feature-item">
            <h3>Real-time Satellite Tracking</h3>
            <p>Watch live satellite orbits with up-to-date data from real TLE sources, visualized in stunning 3D.</p>
          </div>
          <div className="feature-item">
            <h3>Interactive Solar System</h3>
            <p>Explore planets, moons, and their orbits with interactive 3D models and detailed information panels.</p>
          </div>
          <div className="feature-item">
            <h3>Dark & Light Mode</h3>
            <p>Switch between modern light and dark themes to enjoy space exploration any time of day.</p>
          </div>
          <div className="feature-item">
            <h3>Responsive Design</h3>
            <p>Enjoy a seamless experience on any device — from desktop to mobile — with a clean, adaptive UI.</p>
          </div>
          <div className="feature-item">
            <h3>Educational Resources</h3>
            <p>Learn fascinating facts and in-depth science behind orbital mechanics, satellites, and astronomy.</p>
          </div>
          <div className="feature-item">
            <h3>Community & Updates</h3>
            <p>Stay connected with regular updates, space news, and a community of fellow enthusiasts.</p>
          </div>
        </div>
      </section>

      <footer>
        <p>
          &copy; {new Date().getFullYear()} Satyam Kumar Mishra | Created with passion for the cosmos 🚀✨
        </p>
      </footer>
    </div>
  );
}
