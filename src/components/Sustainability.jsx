import React from 'react';
import { HeartHandshake, Leaf } from 'lucide-react';
import styles from './styles/Sustainability.module.css';

export default function Sustainability() {
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
              <h2 className={styles.mainTitle}>Social &amp; Sustainability</h2>
            </div>
            
            <p className={styles.description}>
              People and environment highly matter, we operate our business which aims to produce positive impacts to our community, our nature, in this regard, we would share our profitability as a part of the contribution to the environment, economy, and society, in particular to the territories where our business activities are conducting.
            </p>
            
            <div className={styles.impactBadge}>
              <Leaf size={20} color="var(--color-secondary)" />
              <span className={styles.badgeText}>Committed to Positive Impact</span>
            </div>
          </div>

          <div className={styles.impactCard}>
            <h3 className={styles.cardTitle}>Our Core Impacts</h3>
            <ul className={styles.impactList}>
              {['Community Development', 'Environmental Preservation', 'Economic Support', 'Sustainable Territories'].map((impact, idx) => (
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
