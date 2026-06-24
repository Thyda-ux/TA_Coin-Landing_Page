import React from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone, Calendar, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import styles from './styles/News.module.css';

import { ALL_NEWS_ITEMS as NEWS_ITEMS } from '../data/newsData';

export default function News() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const displayedNews = NEWS_ITEMS.slice(0, 6);
  const hasMore = NEWS_ITEMS.length > 6;

  return (
    <section id="news" className={styles.newsSection}>
      {/* Top Dark Header Section */}
      <div className={styles.headerSection}>
        {/* Decorative blobs */}
        <div className={styles.blob1} />
        <div className={styles.blob2} />

        <div className={`container ${styles.headerContainer}`}>
          <span className={styles.latestUpdateLabel}>
            <Megaphone size={14} /> {t('news.label')}
          </span>
          <h2 className={styles.headerTitle}>
            {t('news.titlePrefix')} <span>{t('news.titleHighlight')}</span>
          </h2>
          <p className={styles.headerSubtitle}>
            {t('news.subtitle')}
          </p>
        </div>
      </div>

      {/* Cards Section */}
      <div className={`container ${styles.cardsSection}`}>
        <div className={styles.newsGrid}>
          {displayedNews.map((item) => (
            <div
              key={item.id}
              className={styles.newsCard}
              onClick={() => navigate(`/news/${item.id}`)}
            >
              {/* Image 16:9 */}
              <div className={styles.imageWrapper}>
                <img
                  src={item.image}
                  alt={item.title}
                  className={styles.newsImage}
                />
                <div className={styles.newsOverlay}></div>

                {/* Hover Icon overlay */}
                <div className={styles.hoverIcon}>
                  <ArrowUpRight size={24} color="#4AC2E3" strokeWidth={2.5} />
                </div>
              </div>

              {/* Content */}
              <div className={styles.cardContent}>
                <div className={styles.cardMeta}>
                  {/* Category */}
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
                  {/* Date */}
                  <div className={styles.dateGroup}>
                    <Calendar size={14} />
                    <span>{item.date}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className={styles.newsTitle}>
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* See all News button */}
        {hasMore && (
          <div className={styles.buttonContainer}>
            <button className={styles.seeAllBtn} onClick={() => navigate('/news')}>
              {t('news.seeAll')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
