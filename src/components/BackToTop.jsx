import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import styles from './styles/BackToTop.module.css';

export default function BackToTop() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Calculate how far the user has scrolled
      const scrolled = window.scrollY;
      // Total scrollable height
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate 5% of the total scrollable height
      const threshold = scrollHeight * 0.05;

      if (scrolled > threshold && scrollHeight > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    
    // Initial check
    toggleVisibility();

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      className={`${styles.backToTop} ${isVisible ? styles.visible : ''}`}
      onClick={scrollToTop}
      aria-label={t('backToTop.ariaLabel')}
    >
      <ArrowUp className={styles.icon} size={28} />
    </button>
  );
}
