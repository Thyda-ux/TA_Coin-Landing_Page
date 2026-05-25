import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import logo from '../assets/T.A Coin Logo.png';
import styles from './styles/Navbar.module.css';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'About', href: '/#about' },
    { name: 'Story', href: '/#story' },
    { name: 'Why Us', href: '/#why-us' },
    { name: 'Sustainability', href: '/#sustainability' },
    { name: 'Careers', href: '/#careers' },
    { name: 'Contact Us', href: '/#contact-us' },
  ];

  return (
    <nav className={`${styles.nav} ${isScrolled ? styles.navScrolled : ''}`}>
      <div className={`container ${styles.navContainer}`}>
        {/* Logo */}
        <a href="#" className={styles.logoLink}>
          <img src={logo} alt="Tacoin Logo" className={styles.logoImg} />
          <span className={styles.logoText}>
            T.A COIN
          </span>
        </a>

        {/* Desktop Nav */}
        <div className={styles.desktopNav}>
          <ul className={styles.navList}>
            {navLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  className={styles.navLink}
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
          <a href="https://app.tacointrade.com/" target="_self" rel="noopener noreferrer" className={`btn btn-primary ${styles.launchBtn}`}>Launch App</a>
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className={styles.mobileNavToggle}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className={`glass ${styles.mobileMenu}`}>
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <a href="https://app.tacointrade.com/" target="_self" rel="noopener noreferrer" className={`btn btn-primary ${styles.mobileLaunchBtn}`}>Launch App</a>
        </div>
      )}
    </nav>
  );
}
