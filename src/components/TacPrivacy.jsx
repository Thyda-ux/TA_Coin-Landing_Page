import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import styles from './styles/LegalPage.module.css';

export default function TacPrivacy() {
  const { t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('privacy.title')}</h1>
          <p className={styles.lastUpdated}>{t('privacy.effectiveDate')}</p>
        </header>

        <div className={styles.card}>
          <section className={styles.section}>
            <p>{t('privacy.intro1')}</p>
            <p>{t('privacy.intro2')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.acceptance.title')}</h2>
            <p>{t('privacy.acceptance.body1')}</p>
            <p>{t('privacy.acceptance.body2')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section1.title')}</h2>
            <p>{t('privacy.section1.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section2.title')}</h2>
            <p>{t('privacy.section2.intro')}</p>

            <h3>{t('privacy.section2.subDirectTitle')}</h3>
            <ul>
              <li><strong>{t('privacy.section2.subDirect.accountTitle')}</strong> {t('privacy.section2.subDirect.accountBody')}</li>
              <li><strong>{t('privacy.section2.subDirect.kycTitle')}</strong> {t('privacy.section2.subDirect.kycBody')}</li>
              <li><strong>{t('privacy.section2.subDirect.financialTitle')}</strong> {t('privacy.section2.subDirect.financialBody')}</li>
              <li><strong>{t('privacy.section2.subDirect.communicationTitle')}</strong> {t('privacy.section2.subDirect.communicationBody')}</li>
              <li><strong>{t('privacy.section2.subDirect.userContentTitle')}</strong> {t('privacy.section2.subDirect.userContentBody')}</li>
            </ul>

            <h3>{t('privacy.section2.subAutoTitle')}</h3>
            <ul>
              <li><strong>{t('privacy.section2.subAuto.deviceTitle')}</strong> {t('privacy.section2.subAuto.deviceBody')}</li>
              <li><strong>{t('privacy.section2.subAuto.usageTitle')}</strong> {t('privacy.section2.subAuto.usageBody')}</li>
              <li><strong>{t('privacy.section2.subAuto.locationTitle')}</strong> {t('privacy.section2.subAuto.locationBody')}</li>
              <li><strong>{t('privacy.section2.subAuto.logTitle')}</strong> {t('privacy.section2.subAuto.logBody')}</li>
              <li><strong>{t('privacy.section2.subAuto.transactionTitle')}</strong> {t('privacy.section2.subAuto.transactionBody')}</li>
            </ul>

            <h3>{t('privacy.section2.subThirdTitle')}</h3>
            <p>{t('privacy.section2.subThirdBody')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section3.title')}</h2>
            <ul>
              <li>{t('privacy.section3.item1')}</li>
              <li>{t('privacy.section3.item2')}</li>
              <li>{t('privacy.section3.item3')}</li>
              <li>{t('privacy.section3.item4')}</li>
              <li>{t('privacy.section3.item5')}</li>
              <li>{t('privacy.section3.item6')}</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section4.title')}</h2>
            <ul>
              <li>{t('privacy.section4.item1')}</li>
              <li>{t('privacy.section4.item2')}</li>
              <li>{t('privacy.section4.item3')}</li>
              <li>{t('privacy.section4.item4')}</li>
              <li>{t('privacy.section4.item5')}</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section5.title')}</h2>
            <p>{t('privacy.section5.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section6.title')}</h2>
            <p>{t('privacy.section6.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section7.title')}</h2>
            <ul>
              <li>{t('privacy.section7.item1')}</li>
              <li>{t('privacy.section7.item2')}</li>
              <li>{t('privacy.section7.item3')}</li>
              <li>{t('privacy.section7.item4')}</li>
              <li>{t('privacy.section7.item5')}</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section8.title')}</h2>
            <p>{t('privacy.section8.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section9.title')}</h2>
            <p>{t('privacy.section9.body')}</p>
          </section>

          <section className={styles.section}>
            <h2>{t('privacy.section10.title')}</h2>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Phone className={styles.contactIcon} size={20} />
                <span>(+855) 71 345 8888</span>
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
