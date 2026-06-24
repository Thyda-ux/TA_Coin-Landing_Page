import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Briefcase, Mail, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import styles from './styles/Careers.module.css';

export default function Careers() {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Users size={28} />,
      iconBg: 'rgba(68,174,216,0.1)',
      iconColor: 'var(--color-primary)',
      title: t('careers.features.diversity.title'),
      description: t('careers.features.diversity.description'),
    },
    {
      icon: <Briefcase size={28} />,
      iconBg: 'rgba(255,215,0,0.1)',
      iconColor: 'var(--color-secondary-dark)',
      title: t('careers.features.growth.title'),
      description: t('careers.features.growth.description'),
    },
  ];

  return (
    <section id="careers" className={`section-padding ${styles.careersSection}`}>
      <div className="container">

        <div className={`grid grid-cols-1 md:grid-cols-2 ${styles.gridContainer}`}>

          <div className="animate-fade-in">
            <h2 className={styles.mainTitle}>
              {t('careers.title')}
            </h2>
            <p className={styles.mainDesc}>
              {t('careers.description')}
            </p>

            <div className={styles.featureList}>
              {features.map((f) => (
                <div key={f.title} className={`glass ${styles.featureCard}`}>
                  <div
                    className={styles.iconWrapper}
                    style={{ backgroundColor: f.iconBg, color: f.iconColor }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <h4 className={styles.featureTitle}>{f.title}</h4>
                    <p className={styles.featureDesc}>{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.mailBanner}>
            <div className={styles.mailIconWrapper}>
              <Mail size={36} />
            </div>
            <h3 className={styles.joinTitle}>{t('careers.joinTitle')}</h3>
            <p className={styles.joinDesc}>{t('careers.joinDesc')}</p>

            <div className={styles.emailBox}>
              <p className={styles.emailLabel}>{t('careers.emailLabel')}</p>
              <a href="mailto:chandara.l@tacointrade.com" className={styles.emailLink}>chandara.l@tacointrade.com</a>
            </div>

            <Link to="/jobs" className={`btn btn-primary ${styles.joinBtn}`}>
              {t('careers.viewPositions')} <ChevronRight size={20} className={styles.chevronIcon} />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
