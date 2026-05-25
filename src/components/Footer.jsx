import React from 'react';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import logo from '../assets/T.A Coin Logo.png';
import googlePlay from '../assets/google-play.png';
import appStore from '../assets/app-store.png';
import styles from './styles/Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'About', href: '/#about' },
    { name: 'Story', href: '/#story' },
    { name: 'Why Us', href: '/#why-us' },
    { name: 'Sustainability', href: '/#sustainability' },
    { name: 'Careers', href: '/#careers' }
  ];

  const legalLinks = [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Use', href: '/terms-of-use' },
    { name: 'Disclaimer', href: '/disclaimer' }
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
              <span className={styles.brandText}>T.A COIN CO., LTD.</span>
            </div>
            <p className={styles.brandDesc}>
              Innovating local investment products and creating market confidence to surge capital inflows to Cambodia.
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
            <h4 className={styles.sectionHeading}>Quick Links</h4>
            <ul className={styles.linkList}>
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className={styles.quickLink}>
                    <span className={styles.arrow}>→</span> {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Contacts Us */}
          <div className={styles.column}>
            <h4 className={styles.sectionHeading}>Contacts Us</h4>
            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <Phone size={20} className={styles.contactIcon} />
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>Hotline</span>
                  <span className={styles.contactValue}>071 345 8888</span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <Mail size={20} className={styles.contactIcon} />
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>Email</span>
                  <span className={styles.contactValue}>customersupport@tacointrade.com</span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <MapPin size={24} className={styles.contactIcon} />
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>Address</span>
                  <span className={styles.addressValue}>
                    Canadia Tower, 3rd Floor, No. 315, Ang Duong Street (Corner of Monivong Blvd), Phnom Penh, Cambodia
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Support Hours */}
          <div className={styles.column}>
            <h4 className={styles.sectionHeading}>Support Hours</h4>
            <div className={styles.hoursBox}>
              <div className={styles.hoursRow}>
                <Clock size={18} className={styles.hoursIcon} />
                <div className={styles.hoursText}>
                  <span className={styles.dayRange}>Monday - Friday</span>
                  <span className={styles.timeRange}>8:00 to 17:30</span>
                </div>
              </div>
              <div className={styles.hoursRow}>
                <Clock size={18} className={styles.hoursIcon} />
                <div className={styles.hoursText}>
                  <span className={styles.dayRange}>Saturday</span>
                  <span className={styles.timeRange}>8:00 to 12:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Download App */}
          <div className={`${styles.column} ${styles.downloadColumn}`}>
            <h4 className={styles.sectionHeading}>Download T.A Coin App</h4>
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
            © {currentYear} T.A Coin. All rights reserved.
          </div>
          <div className={styles.legalLinks}>
            {legalLinks.map((link, idx) => (
              <React.Fragment key={link.name}>
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
