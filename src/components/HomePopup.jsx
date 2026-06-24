import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './styles/HomePopup.module.css';

// Using news_airport as a placeholder. You can swap this with the actual Canadia advert image asset.
import bannerImage from '../assets/news_airport.png';

export default function HomePopup() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    // Show popup shortly after component mounts (page load)
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 800); // slight delay makes the entrance feel organic

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (timeLeft > 0) {
      const countdown = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [isOpen, timeLeft]);

  // Prevent scrolling on the main page while the popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup incase component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleOverlayClick = () => {
    if (timeLeft === 0) {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popupCard} onClick={(e) => e.stopPropagation()}>



        <div className={styles.imageContainer}>
          <img src={bannerImage} alt="T.A Coin Update Notice" className={styles.bannerImage} />
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>{t('homePopup.title')}</h2>
          <div className={styles.message}>
            <p>{t('homePopup.greeting')}</p>
            <p>{t('homePopup.para1')}</p>
            <p>{t('homePopup.para2')}</p>
            <p>{t('homePopup.para3')}</p>
            <p>{t('homePopup.para4')}</p>
          </div>

          <div className={`${styles.closeHint} ${timeLeft === 0 ? styles.ready : ''}`}>
            {timeLeft > 0 ? t('homePopup.countdown', { seconds: timeLeft }) : t('homePopup.ready')}
          </div>
        </div>

      </div>
    </div>
  );
}
