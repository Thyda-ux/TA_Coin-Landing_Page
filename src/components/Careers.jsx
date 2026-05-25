import React from 'react';
import { Users, Briefcase, Mail, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import styles from './styles/Careers.module.css';

const FEATURES = [
  {
    icon: <Users size={28} />,
    iconBg: 'rgba(68,174,216,0.1)',
    iconColor: 'var(--color-primary)',
    title: 'Diversity & Inclusion',
    description: 'A welcoming culture for all backgrounds.',
  },
  {
    icon: <Briefcase size={28} />,
    iconBg: 'rgba(255,215,0,0.1)',
    iconColor: 'var(--color-secondary-dark)',
    title: 'Career Growth',
    description: 'Shape a sustainable real estate future with us.',
  },
];

export default function Careers() {
  return (
    <section id="careers" className={`section-padding ${styles.careersSection}`}>
      <div className="container">

        <div className={`grid grid-cols-1 md:grid-cols-2 ${styles.gridContainer}`}>

          <div className="animate-fade-in">
            <h2 className={styles.mainTitle}>
              Careers at T.A Coin
            </h2>
            <p className={styles.mainDesc}>
              We embrace diversity, promote women leadership, and encourage candidates from different cultures or backgrounds. We value every of our employee inputs, their thoughts and opinions to shape a fully sustainable and reliable real estate company.
            </p>

            <div className={styles.featureList}>
              {FEATURES.map((f) => (
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
            <h3 className={styles.joinTitle}>Join Our Team</h3>
            <p className={styles.joinDesc}>Ready to make an impact? We're always looking for talented individuals to join our growing family.</p>

            <div className={styles.emailBox}>
              <p className={styles.emailLabel}>Email HR TEAM</p>
              <a href="mailto:chandara.l@tacointrade.com" className={styles.emailLink}>chandara.l@tacointrade.com</a>
            </div>

            <Link to="/jobs" className={`btn btn-primary ${styles.joinBtn}`}>
              View Open Positions <ChevronRight size={20} className={styles.chevronIcon} />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
