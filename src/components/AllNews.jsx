import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './styles/AllNews.module.css';

import { ALL_NEWS_ITEMS } from '../data/newsData';

const TABS = ['Alls', 'News', 'Events', 'Campaign'];

export default function AllNews() {
  const [activeTab, setActiveTab] = useState('Alls');
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const filteredNews = ALL_NEWS_ITEMS.filter((item) => {
    if (activeTab === 'Alls') return true;
    if (activeTab === 'Campaign') return false; // no campaign items yet
    return item.category === activeTab;
  });

  return (
    <div className={styles.pageWrapper}>
      {/* Light Header */}
      <div className={styles.headerSection}>
        <div className={`container ${styles.headerContainer}`}>
          <span className={styles.latestUpdateLabel}>
            <Megaphone size={14} /> LATEST UPDATE
          </span>
          <h1 className={styles.headerTitle}>
            Insight and news from <span>T.A team</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Stay updated with the latest news, events, and insights from T.A Coin
          </p>
        </div>
      </div>

      {/* Filter Tabs (pill buttons) */}
      <div className={`container ${styles.filterRow}`}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.filterTab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className={`container ${styles.cardsSection}`}>
        {filteredNews.length === 0 ? (
          <p className={styles.emptyState}>No items in this category yet.</p>
        ) : (
          <div className={styles.newsGrid}>
            {filteredNews.map((item) => (
              <div 
                key={item.id} 
                className={styles.newsCard}
                onClick={() => navigate(`/news/${item.id}`)}
              >
                <div className={styles.imageWrapper}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className={styles.newsImage}
                  />
                  <div className={styles.newsOverlay} />
                  <div className={styles.hoverIcon}>
                    <ArrowUpRight size={24} color="#4AC2E3" strokeWidth={2.5} />
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.cardMeta}>
                    <div className={styles.categoryGroup}>
                      <div
                        className={styles.categoryLine}
                        style={{ backgroundColor: item.categoryColor }}
                      />
                      <span
                        className={styles.categoryText}
                        style={{ color: item.categoryColor }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <div className={styles.dateGroup}>
                      <Calendar size={14} />
                      <span>{item.date}</span>
                    </div>
                  </div>
                  <h3 className={styles.newsTitle}>{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
