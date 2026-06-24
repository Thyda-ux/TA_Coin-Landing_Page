import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import logo from '../assets/T.A Coin Logo.png';
import LanguageSwitcher from './LanguageSwitcher';
import styles from './styles/Navbar.module.css';

export default function Navbar() {
  const { t } = useTranslation();
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
    { name: t('nav.about'), href: '/#about' },
    { name: t('nav.story'), href: '/#story' },
    { name: t('nav.whyUs'), href: '/#why-us' },
    { name: t('nav.sustainability'), href: '/#sustainability' },
    { name: t('nav.careers'), href: '/#careers' },
    { name: t('nav.contactUs'), href: '/#contact-us' },
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
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.navLink}
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
          <LanguageSwitcher />
          <a href="https://app.tacointrade.com/" target="_self" rel="noopener noreferrer" className={`btn btn-primary ${styles.launchBtn}`}>{t('nav.launchApp')}</a>
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
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <LanguageSwitcher variant="mobile" />
          <a href="https://app.tacointrade.com/" target="_self" rel="noopener noreferrer" className={`btn btn-primary ${styles.mobileLaunchBtn}`}>{t('nav.launchApp')}</a>
        </div>
      )}
    </nav>
  );
}
