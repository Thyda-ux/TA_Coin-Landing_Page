import React from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import logo from '../assets/T.A Coin Logo.png';
import googlePlay from '../assets/google-play.png';
import appStore from '../assets/app-store.png';
import styles from './styles/Footer.module.css';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: t('nav.about'), href: '/#about' },
    { name: t('nav.story'), href: '/#story' },
    { name: t('nav.whyUs'), href: '/#why-us' },
    { name: t('nav.sustainability'), href: '/#sustainability' },
    { name: t('nav.careers'), href: '/#careers' }
  ];

  const legalLinks = [
    { name: t('footer.privacyPolicy'), href: '/privacy-policy' },
    { name: t('footer.termsOfUse'), href: '/terms-of-use' },
    { name: t('footer.disclaimer'), href: '/disclaimer' }
  ];

  return (
    <footer id="contact" className={styles.footerSection}>
      <div className="container">
        <div className={styles.footerGrid}>

          {/* 1. Brand & Social */}
          <div className={styles.column}>
            <div className={styles.brandHeader}>
              <div className={styles.logoWrapper}>
                <img src={logo} alt="Tacoin Logo" className={styles.brandLogo} />
              </div>
              <span className={styles.brandText}>{t('footer.brand')}</span>
            </div>
            <p className={styles.brandDesc}>
              {t('footer.brandDesc')}
            </p>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialIcon} title="Facebook">
                <Icon icon="ri:facebook-circle-fill" width="24" height="24" />
              </a>
              <a href="#" className={styles.socialIcon} title="Telegram">
                <Icon icon="ri:telegram-fill" width="24" height="24" />
              </a>
              <a href="#" className={styles.socialIcon} title="LinkedIn">
                <Icon icon="ri:linkedin-box-fill" width="24" height="24" />
              </a>
            </div>
          </div>

          {/* 2. Quick Links */}
          <div className={styles.column}>
            <h4 className={styles.sectionHeading}>{t('footer.quickLinks')}</h4>
            <ul className={styles.linkList}>
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={styles.quickLink}>
                    <span className={styles.arrow}>→</span> {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Contacts Us */}
          <div className={styles.column}>
            <h4 className={styles.sectionHeading}>{t('footer.contactsUs')}</h4>
            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <Phone size={20} className={styles.contactIcon} />
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{t('footer.hotline')}</span>
                  <span className={styles.contactValue}>071 345 8888</span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <Mail size={20} className={styles.contactIcon} />
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{t('footer.email')}</span>
                  <span className={styles.contactValue}>customersupport@tacointrade.com</span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <MapPin size={24} className={styles.contactIcon} />
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{t('footer.address')}</span>
                  <span className={styles.addressValue}>
                    {t('footer.addressValue')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Support Hours */}
          <div className={styles.column}>
            <h4 className={styles.sectionHeading}>{t('footer.supportHours')}</h4>
            <div className={styles.hoursBox}>
              <div className={styles.hoursRow}>
                <Clock size={18} className={styles.hoursIcon} />
                <div className={styles.hoursText}>
                  <span className={styles.dayRange}>{t('footer.weekdays')}</span>
                  <span className={styles.timeRange}>8:00 to 17:30</span>
                </div>
              </div>
              <div className={styles.hoursRow}>
                <Clock size={18} className={styles.hoursIcon} />
                <div className={styles.hoursText}>
                  <span className={styles.dayRange}>{t('footer.saturday')}</span>
                  <span className={styles.timeRange}>8:00 to 12:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Download App */}
          <div className={`${styles.column} ${styles.downloadColumn}`}>
            <h4 className={styles.sectionHeading}>{t('footer.downloadApp')}</h4>
            <div className={styles.downloadGroup}>
              <a href="#" className={styles.badgeLink}>
                <img src={googlePlay} alt="Get it on Google Play" className={styles.storeBadge} />
              </a>
              <a href="#" className={styles.badgeLink}>
                <img src={appStore} alt="Download on the App Store" className={styles.storeBadge} />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            {t('footer.copyright', { year: currentYear })}
          </div>
          <div className={styles.legalLinks}>
            {legalLinks.map((link, idx) => (
              <React.Fragment key={link.href}>
                <Link to={link.href} className={styles.legalLink}>{link.name}</Link>
                {idx < legalLinks.length - 1 && <span className={styles.divider}>|</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
