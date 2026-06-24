import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import styles from './styles/Hero.module.css';

export default function Hero() {
  const { t } = useTranslation();
  return (
    <header id="about" className={`hero-section ${styles.heroSection}`}>
      {/* Airport Background Image */}
      <div className={styles.bgImage}></div>

      {/* Gradient Blur Overlay matching Tacoin Colors */}
      <div className={styles.gradientOverlay}></div>

      <div className="container">
        <div className={styles.contentContainer}>
          <div className={`animate-fade-in ${styles.badge}`}>
            {t('hero.badge')}
          </div>

          <h1 className={`animate-fade-in ${styles.mainHeading}`}>
            {t('hero.titlePrefix')} <br /><span className={styles.highlightText}>{t('hero.titleBrand')}</span>
          </h1>

          <p className={`animate-fade-in ${styles.subText}`}>
            {t('hero.subtitle')}
          </p>

          <div className={`animate-fade-in ${styles.actionContainer}`}>
            <a href="#why-us" className={`btn btn-primary ${styles.primaryBtn}`}>
              {t('hero.whyChooseUs')} <ArrowRight size={18} />
            </a>
            <a href="#story" className={`btn btn-outline ${styles.outlineBtn}`}>
              {t('hero.ourStory')}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
