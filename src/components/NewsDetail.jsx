import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import styles from './styles/NewsDetail.module.css';

import { ALL_NEWS_ITEMS } from '../data/newsData';

export default function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const newsItem = ALL_NEWS_ITEMS.find((item) => item.id === parseInt(id, 10));

  if (!newsItem) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.detailContainer}>
          <h2 className={styles.newsTitle}>News item not found</h2>
          <div className={styles.buttonContainer}>
            <button className={styles.seeAllBtn} onClick={() => navigate('/news')}>
              See all News
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get up to 3 other news items for "Explore Other News"
  const exploreNews = ALL_NEWS_ITEMS.filter((item) => item.id !== newsItem.id).slice(0, 3);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.detailContainer}>
        
        {/* Main Article Layout */}
        <h1 className={styles.newsTitle}>{newsItem.title}</h1>
        
        <div className={styles.cardMeta}>
          <div className={styles.categoryGroup}>
            <div
              className={styles.categoryLine}
              style={{ backgroundColor: newsItem.categoryColor }}
            />
            <span
              className={styles.categoryText}
              style={{ color: newsItem.categoryColor }}
            >
              {newsItem.category}
            </span>
          </div>
          <div className={styles.dateGroup}>
            <Calendar size={15} />
            <span>{newsItem.date}</span>
          </div>
        </div>

        <div className={styles.imageWrapper}>
          <img 
            src={newsItem.image} 
            alt={newsItem.title} 
            className={styles.mainImage} 
          />
        </div>

        <div 
          className={styles.articleContent}
          dangerouslySetInnerHTML={{ __html: newsItem.content }}
        />

        {/* Explore Other News Section */}
        <div className={styles.relatedSection}>
          <h2 className={styles.exploreTitle}>Explore Other News</h2>
          
          <div className={styles.relatedGrid}>
            {exploreNews.map((item) => (
              <div 
                key={item.id} 
                className={styles.newsCard}
                onClick={() => navigate(`/news/${item.id}`)}
              >
                <div className={styles.cardImageWrapper}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className={styles.cardImage}
                  />
                </div>
                <div className={styles.cardContentInner}>
                  <div className={styles.cardMeta} style={{ marginBottom: '1rem' }}>
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
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.buttonContainer}>
            <button className={styles.seeAllBtn} onClick={() => navigate('/news')}>
              See all News
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
