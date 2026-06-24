import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import styles from './styles/LegalPage.module.css';

export default function TacTerms() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('terms.title')}</h1>
          <p className={styles.lastUpdated}>{t('terms.effectiveDate')}</p>
        </header>

        <div className={styles.card}>
          <section className={styles.section}>
            <p><strong>{t('terms.companyName')}</strong></p>
            <p>{t('terms.welcome')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section1.title')}</h2>
            <ul>
              <li><strong>{t('terms.section1.item11Title')}</strong> {t('terms.section1.item11Body')}</li>
              <li><strong>{t('terms.section1.item12Title')}</strong> {t('terms.section1.item12Body')}</li>
              <li><strong>{t('terms.section1.item13Title')}</strong> {t('terms.section1.item13Body')}</li>
              <li><strong>{t('terms.section1.item14Title')}</strong> {t('terms.section1.item14Body')}</li>
              <li><strong>{t('terms.section1.item15Title')}</strong> {t('terms.section1.item15Body')}</li>
              <li><strong>{t('terms.section1.item16Title')}</strong> {t('terms.section1.item16Body')}</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section2.title')}</h2>
            <p>{t('terms.section2.body1')}</p>
            <p>{t('terms.section2.body2')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section3.title')}</h2>
            <p>{t('terms.section3.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section4.title')}</h2>
            <p><strong>{t('terms.section4.sercTitle')}</strong> {t('terms.section4.sercBody')}</p>
            <p><strong>{t('terms.section4.qiTitle')}</strong> {t('terms.section4.qiBody')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section5.title')}</h2>
            <p>{t('terms.section5.body1')}</p>
            <p><strong>{t('terms.section5.noLendingTitle')}</strong> {t('terms.section5.noLendingBody')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section6.title')}</h2>
            <p>{t('terms.section6.body1')}</p>
            <p><strong>{t('terms.section6.noLiabilityTitle')}</strong> {t('terms.section6.noLiabilityBody')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section7.title')}</h2>
            <p>{t('terms.section7.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section8.title')}</h2>
            <p>{t('terms.section8.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section9.title')}</h2>
            <p>{t('terms.section9.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section11.title')}</h2>
            <p>{t('terms.section11.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section12.title')}</h2>
            <p>{t('terms.section12.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section13.title')}</h2>
            <p>{t('terms.section13.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section19.title')}</h2>
            <p>{t('terms.section19.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.section24.title')}</h2>
            <p>{t('terms.section24.body1')}</p>
            <p>{t('terms.section24.body2')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('terms.contactTitle')}</h2>
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
                <a href="https://t.me/tacustomersupport" target="_blank" rel="noopener noreferrer">{t('terms.telegramSupport')}</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
