import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/T.A Coin Logo.png';
import styles from './styles/Story.module.css';

export default function Story() {
  const { t } = useTranslation();
  return (
    <section id="story" className={`section-padding ${styles.storySection}`}>
      <div className="container">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${styles.gridContainer}`}>

          {/* Text Content */}
          <div className={styles.textCol}>
            <div className={`badge ${styles.originBadge}`}>
              {t('story.badge')}
            </div>
            <h2 className={styles.storyTitle}>
              {t('story.title')}
            </h2>
            <p className={styles.storyText}>
              {t('story.paragraph1')}
            </p>
            <p className={styles.storyText}>
              {t('story.paragraph2')}
            </p>
            <p className={styles.storyTextLast}>
              {t('story.paragraph3')}
            </p>
          </div>

          {/* Visual Side */}
          <div className={styles.visualCol}>
            <div className={styles.visualImageWrapper}>
              <div className={styles.visualBlob}></div>

              {/* Blur Overlay */}
              <div className={styles.blurOverlay}></div>

              <div className={styles.textOverlay}>
                <img src={logo} alt="Tacoin Concept" className={styles.overlayLogo} />
                <h3 className={styles.overlayTitle}>{t('story.overlayTitle')}</h3>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
