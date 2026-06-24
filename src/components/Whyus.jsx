import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Coins, FileText, Handshake, HandCoins } from 'lucide-react';
import styles from './styles/Whyus.module.css';

export default function Whyus() {
  const { t } = useTranslation();

  const cards = [
    {
      title: t('whyus.knowhow.title'),
      icon: <Lightbulb size={32} color="#0f172a" />,
      content: (
        <p className={styles.cardText}>
          {t('whyus.knowhow.body')}
        </p>
      ),
    },
    {
      title: t('whyus.exposure.title'),
      icon: <Coins size={32} color="#0f172a" />,
      content: (
        <ul className={styles.cardList}>
          <li className={styles.cardListItem}>{t('whyus.exposure.bullet1')}</li>
          <li className={styles.cardListItem}>{t('whyus.exposure.bullet2')}</li>
        </ul>
      ),
    },
    {
      title: t('whyus.disclosures.title'),
      icon: <FileText size={32} color="#0f172a" />,
      content: (
        <ul className={styles.cardList}>
          <li className={styles.cardListItem}>{t('whyus.disclosures.bullet1')}</li>
          <li className={styles.cardListItem}>{t('whyus.disclosures.bullet2')}</li>
        </ul>
      ),
    },
    {
      title: t('whyus.compliance.title'),
      icon: <Handshake size={32} color="#0f172a" />,
      content: (
        <ul className={styles.cardList}>
          <li className={styles.cardListItem}>{t('whyus.compliance.bullet1')}</li>
          <li className={styles.cardListItem}>{t('whyus.compliance.bullet2')}</li>
          <li className={styles.cardListItem}>{t('whyus.compliance.bullet3')}</li>
          <li className={styles.cardListItem}>{t('whyus.compliance.bullet4')}</li>
        </ul>
      ),
      className: styles.cardWide
    },
    {
      title: t('whyus.profit.title'),
      icon: <HandCoins size={32} color="#0f172a" />,
      content: (
        <p className={styles.cardText}>
          {t('whyus.profit.body')}
        </p>
      ),
    }
  ];

  return (
    <section id="why-us" className={`section-padding ${styles.whyusSection}`}>
      <div className="container">

        <div className={styles.headerDiv}>
          <h2 className={styles.mainTitle}>
            {t('whyus.title')}
          </h2>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${styles.gridContainer}`}>
          {cards.map((card, index) => (
            <div key={index} className={`${styles.whyCard} ${card.className || ''}`}>

              <div className={styles.iconWrapper}>
                {card.icon}
                <div className={styles.iconAccent}></div>
              </div>

              <h3 className={styles.cardTitle}>
                {card.title}
              </h3>

              {card.content}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
