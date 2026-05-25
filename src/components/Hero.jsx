import React from 'react';
import { ArrowRight } from 'lucide-react';
import styles from './styles/Hero.module.css';

export default function Hero() {
  return (
    <header id="about" className={`hero-section ${styles.heroSection}`}>
      {/* Airport Background Image */}
      <div className={styles.bgImage}></div>

      {/* Gradient Blur Overlay matching Tacoin Colors */}
      <div className={styles.gradientOverlay}></div>

      <div className="container">
        <div className={styles.contentContainer}>
          <div className={`animate-fade-in ${styles.badge}`}>
            Innovating Local Investment
          </div>

          <h1 className={`animate-fade-in ${styles.mainHeading}`}>
            Build the future with <br /><span className={styles.highlightText}>T.A COIN</span>
          </h1>

          <p className={`animate-fade-in ${styles.subText}`}>
            Our mission is to innovate local investment products, inspire and develop locals, create market confidence, and strategize digital fund portfolios.
          </p>

          <div className={`animate-fade-in ${styles.actionContainer}`}>
            <a href="#why-us" className={`btn btn-primary ${styles.primaryBtn}`}>
              Why Choose Us <ArrowRight size={18} />
            </a>
            <a href="#story" className={`btn btn-outline ${styles.outlineBtn}`}>
              Our Story
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
