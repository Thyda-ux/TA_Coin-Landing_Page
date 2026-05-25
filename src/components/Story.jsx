import React from 'react';
import logo from '../assets/T.A Coin Logo.png';
import styles from './styles/Story.module.css';

export default function Story() {
  return (
    <section id="story" className={`section-padding ${styles.storySection}`}>
      <div className="container">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${styles.gridContainer}`}>

          {/* Text Content */}
          <div className={styles.textCol}>
            <div className={`badge ${styles.originBadge}`}>
              Our Origin
            </div>
            <h2 className={styles.storyTitle}>
              The Story of T.A Coin
            </h2>
            <p className={styles.storyText}>
              Following the upward trend of the global crypto-assets business, the TA was named from the Techo International Airport, and to memorize its grand opening moment of the world 9th largest airport in Cambodia.
            </p>
            <p className={styles.storyText}>
              It was the great time for the establishment of the TA Coin Company in 2025 in considering of the new airport operations which fund raising is the key matter to support their working capital. To tackle all the challenges of raising fund either from the debt or equity markets overseas as the main covenants are all located in Cambodia, we “TA Coin” will be the key partner in collecting funds from investors who are interested in the new airport investments including the property development in its surrounding areas. Potentially, the investment will be further funds the future expansion of the Phase 2 and the Phase 3 of the new airport.
            </p>
            <p className={styles.storyTextLast}>
              With the brilliant ideas from our key shareholders, the crypto-assets business will bring in crypto experts and transfer the expertise to Cambodia young generation, providing them a chance to learn new things and continuous strengthening their crypto related skills to welcome and be ready to the crypto growing markets.
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
                <h3 className={styles.overlayTitle}>Fueling Growth in Cambodia</h3>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
