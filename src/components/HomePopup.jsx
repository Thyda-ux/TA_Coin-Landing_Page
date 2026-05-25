import React, { useState, useEffect } from 'react';
import styles from './styles/HomePopup.module.css';

// Using news_airport as a placeholder. You can swap this with the actual Canadia advert image asset.
import bannerImage from '../assets/news_airport.png';

export default function HomePopup() {
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
          <h2 className={styles.title}>T.A Coin Important Update!</h2>
          <div className={styles.message}>
            <p>Dear Valued T.A Coin Users,</p>
            <p>
              We are excited to announce major upgrades to the T.A Coin ecosystem. Our platform is evolving to provide you with faster transactions, lower fees, and a more intuitive digital asset management experience.
            </p>
            <p>
              What's new: Enhanced KHQR payment integration, expanded merchant network across Cambodia, and improved security for your digital wallet. We recommend all users to explore these new features and update their preferences within the app.
            </p>
            <p>
              We are constantly working to improve our systems to provide you with the most secure, efficient, and user-friendly digital finance experience possible. Our mission remains focused on driving financial innovation and creating trust in the digital asset market of Cambodia.
            </p>
            <p>
              Thank you for being a part of the T.A Coin journey. We appreciate your continued trust and support as we build the future of finance together.
            </p>
          </div>

          <div className={`${styles.closeHint} ${timeLeft === 0 ? styles.ready : ''}`}>
            {timeLeft > 0 ? `You can close this window in ${timeLeft} seconds...` : 'Click anywhere outside this box to close.'}
          </div>
        </div>

      </div>
    </div>
  );
}
