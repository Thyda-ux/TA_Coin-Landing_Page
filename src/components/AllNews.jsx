import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Calendar, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './styles/AllNews.module.css';

import { ALL_NEWS_ITEMS } from '../data/newsData';

const TAB_KEYS = [
  { key: 'Alls', i18nKey: 'allNews.tabAll' },
  { key: 'News', i18nKey: 'allNews.tabNews' },
  { key: 'Events', i18nKey: 'allNews.tabEvents' },
  { key: 'Campaign', i18nKey: 'allNews.tabCampaign' },
];

export default function AllNews() {
  const { t } = useTranslation();
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
            <Megaphone size={14} /> {t('news.label')}
          </span>
          <h1 className={styles.headerTitle}>
            {t('news.titlePrefix')} <span>{t('news.titleHighlight')}</span>
          </h1>
          <p className={styles.headerSubtitle}>
            {t('news.subtitle')}
          </p>
        </div>
      </div>

      {/* Filter Tabs (pill buttons) */}
      <div className={`container ${styles.filterRow}`}>
        {TAB_KEYS.map(({ key, i18nKey }) => (
          <button
            key={key}
            className={`${styles.filterTab} ${activeTab === key ? styles.active : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {t(i18nKey)}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className={`container ${styles.cardsSection}`}>
        {filteredNews.length === 0 ? (
          <p className={styles.emptyState}>{t('allNews.empty')}</p>
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
