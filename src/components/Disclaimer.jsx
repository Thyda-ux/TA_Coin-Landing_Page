import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, AlertCircle, ExternalLink } from 'lucide-react';
import styles from './styles/LegalPage.module.css';

export default function Disclaimer() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('disclaimer.title')}</h1>
          <p className={styles.lastUpdated}>{t('disclaimer.lastUpdated')}</p>
        </header>

        <div className={styles.card}>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
            <AlertCircle size={64} color="var(--color-primary)" style={{ marginBottom: 'var(--spacing-4)' }} />
            <h2 style={{ border: 'none' }}>{t('disclaimer.comingSoonTitle')}</h2>
            <p>{t('disclaimer.comingSoon1')}</p>
            <p>{t('disclaimer.comingSoon2')}</p>
          </div>

          <section className={styles.section}>
            <h2>{t('disclaimer.contactTeam')}</h2>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Phone className={styles.contactIcon} size={20} />
                <span>+855 71 345 8888</span>
              </div>
              <div className={styles.contactItem}>
                <Mail className={styles.contactIcon} size={20} />
                <span>customersupport@tacointrade.com</span>
              </div>
              <div className={styles.contactItem}>
                <ExternalLink className={styles.contactIcon} size={20} />
                <a href="https://t.me/tacustomersupport" target="_blank" rel="noopener noreferrer">{t('disclaimer.telegramSupport')}</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
