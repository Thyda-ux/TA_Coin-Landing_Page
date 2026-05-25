import React, { useEffect } from 'react';
import { Mail, Phone, AlertCircle, ExternalLink } from 'lucide-react';
import styles from './styles/LegalPage.module.css';

export default function Disclaimer() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>Disclaimer</h1>
          <p className={styles.lastUpdated}>Last Updated: April 17th, 2026</p>
        </header>

        <div className={styles.card}>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-8) 0' }}>
            <AlertCircle size={64} color="var(--color-primary)" style={{ marginBottom: 'var(--spacing-4)' }} />
            <h2 style={{ border: 'none' }}>Information Coming Soon</h2>
            <p>
              We are currently updating our Disclaimer information to ensure it provides the most accurate and up-to-date guidance for our users.
            </p>
            <p>
              Please check back soon for the full content of this page. In the meantime, if you have any urgent questions, please feel free to reach out to our support team.
            </p>
          </div>

          <section className={styles.section}>
            <h2>Contact Our Team</h2>
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
                <a href="https://t.me/tacustomersupport" target="_blank" rel="noopener noreferrer">Telegram Support</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
