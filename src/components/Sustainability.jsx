import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeartHandshake, Leaf } from 'lucide-react';
import styles from './styles/Sustainability.module.css';

export default function Sustainability() {
  const { t } = useTranslation();
  const impacts = [
    t('sustainability.impacts.community'),
    t('sustainability.impacts.environment'),
    t('sustainability.impacts.economy'),
    t('sustainability.impacts.territories'),
  ];

  return (
    <section id="sustainability" className={`section-padding ${styles.sustainabilitySection}`}>
      {/* Background Decor */}
      <div className={styles.bgDecor}></div>

      <div className={`container ${styles.contentContainer}`}>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${styles.gridContainer}`}>

          <div>
            <div className={styles.titleWrapper}>
              <div className={styles.iconWrapper}>
                <HeartHandshake size={28} />
              </div>
              <h2 className={styles.mainTitle}>{t('sustainability.title')}</h2>
            </div>

            <p className={styles.description}>
              {t('sustainability.description')}
            </p>

            <div className={styles.impactBadge}>
              <Leaf size={20} color="var(--color-secondary)" />
              <span className={styles.badgeText}>{t('sustainability.badge')}</span>
            </div>
          </div>

          <div className={styles.impactCard}>
            <h3 className={styles.cardTitle}>{t('sustainability.cardTitle')}</h3>
            <ul className={styles.impactList}>
              {impacts.map((impact, idx) => (
                <li
                  key={idx}
                  className={`${styles.impactItem} ${idx !== 3 ? styles.impactItemBorder : ''}`}
                >
                  <div className={styles.listDot}></div>
                  <span className={styles.listText}>{impact}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
