import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Users, Briefcase, Search, CheckCircle, MapPin, Mail, MessageCircle, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import styles from './styles/Jobs.module.css';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTitle, setExpandedTitle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyPosition, setApplyPosition] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      if (!supabase) {
        setJobs([]);
        return;
      }

      console.log('Fetching jobs from Supabase...');
      // Fetching all published jobs. We check for both lowercase and capitalized just in case.
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .or('status.eq.published,status.eq.Published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Jobs data received successfully:', data);
      setJobs(data || []);
    } catch (err) {
      console.error('Error in fetchJobs execution:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (title) => {
    if (expandedTitle === title) {
      setExpandedTitle(null);
    } else {
      setExpandedTitle(title);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.pageContainer}>
      <div className={`container ${styles.contentContainer}`}>


        <div className={styles.headerDiv}>
          <h1 className={styles.headerTitle}>Open Positions</h1>
          <p className={styles.headerDesc}>Join the team fueling growth and innovation in Cambodia.</p>
        </div>

        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <div className={styles.searchWrapper}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search available positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        <div className={styles.jobList}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loader2 size={48} className={`animate-spin ${styles.loadingSpinner}`} />
              <p className={styles.loadingText}>Loading positions...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className={styles.emptyStateContainer}>
              <p className={styles.emptyStateText}>No positions found matching "{searchTerm}".</p>
              <button
                onClick={() => setSearchTerm('')}
                className={styles.clearSearchBtn}
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredJobs.map((job, index) => {
              const isExpanded = expandedTitle === job.title;

              return (
                <div
                  key={index}
                  className={`${styles.jobCard} ${isExpanded ? styles.jobCardExpanded : ''}`}
                >
                  <div
                    onClick={() => toggleExpand(job.title)}
                    className={`${styles.jobHeader} ${isExpanded ? styles.jobHeaderExpanded : ''}`}
                  >
                    <div>
                      <h2 className={styles.jobTitle}>
                        {job.title}
                      </h2>
                      <div className={styles.jobMetaContainer}>
                        <span className={styles.jobMetaItem}>
                          <MapPin size={16} /> {job.city || 'Phnom Penh'}, {job.country || 'Cambodia'}
                        </span>
                        <span className={styles.jobMetaItem}>
                          <Users size={16} /> {job.person_count || '1'} Available
                        </span>
                        <span className={styles.jobMetaItem}>
                          <Briefcase size={16} /> {job.type}
                        </span>
                      </div>
                    </div>
                    <div className={styles.expandIcon}>
                      {isExpanded ? <ChevronUp size={28} /> : <ChevronDown size={28} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.expandedContent}>
                      <div className={styles.detailsWrapper}>

                        {/* Accountabilities */}
                        <div>
                          <h3 className={styles.sectionTitle}>
                            <CheckCircle size={18} color="var(--color-primary)" /> Key Accountabilities
                          </h3>
                          <div className={styles.richTextContainer}>
                            {typeof job.key_accountabilities === 'string' && job.key_accountabilities.trim().startsWith('<') ? (
                              <div dangerouslySetInnerHTML={{ __html: job.key_accountabilities }} />
                            ) : (
                              <ul style={{ margin: 0 }}>
                                {(Array.isArray(job.key_accountabilities) ? job.key_accountabilities : (job.key_accountabilities?.split('\n') || [])).map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Requirements */}
                        <div>
                          <h3 className={styles.sectionTitle}>
                            <CheckCircle size={18} color="var(--color-secondary-dark)" /> Knowledge & Requirements
                          </h3>
                          <div className={styles.richTextContainer}>
                            {typeof job.knowledge_requirements === 'string' && job.knowledge_requirements.trim().startsWith('<') ? (
                              <div dangerouslySetInnerHTML={{ __html: job.knowledge_requirements }} />
                            ) : (
                              <ul style={{ margin: 0 }}>
                                {(Array.isArray(job.knowledge_requirements) ? job.knowledge_requirements : (job.knowledge_requirements?.split('\n') || [])).map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Working Conditions */}
                        <div>
                          <h3 className={styles.sectionTitle}>
                            <CheckCircle size={18} color="green" /> Working Conditions
                          </h3>
                          <div className={styles.richTextContainer}>
                            {typeof job.working_conditions === 'string' && job.working_conditions.trim().startsWith('<') ? (
                              <div dangerouslySetInnerHTML={{ __html: job.working_conditions }} />
                            ) : (
                              <ul style={{ margin: 0 }}>
                                {(Array.isArray(job.working_conditions) ? job.working_conditions : (job.working_conditions?.split('\n') || [])).map((item, i) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        <button
                          className={`btn btn-primary ${styles.applyButton}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setApplyPosition(job.title);
                            setShowApplyModal(true);
                          }}
                        >
                          Apply for this position
                        </button>

                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {showApplyModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowApplyModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowApplyModal(false)}
              className={styles.closeButton}
            >
              <X size={24} />
            </button>
            <h2 className={styles.modalTitle}>Apply for Position</h2>
            <p className={styles.modalSubtitle}>{applyPosition}</p>

            <p className={styles.modalDesc}>To apply, please reach out to our recruitment team using one of the following methods:</p>

            <div className={styles.contactMethodsContainer}>
              <a href="mailto:chandara.l@tacointrade.com" className={styles.contactMethodLink}>
                <Mail size={24} color="var(--color-primary)" />
                <div className={styles.contactMethodText}>
                  <div className={styles.contactMethodLabel}>Email Application</div>
                  <div className={styles.contactMethodValue}>chandara.l@tacointrade.com</div>
                </div>
              </a>

              <a href="https://t.me/+85589555672" target="_blank" rel="noreferrer" className={styles.contactMethodLink}>
                <MessageCircle size={24} color="var(--color-secondary-dark)" />
                <div className={styles.contactMethodText}>
                  <div className={styles.contactMethodLabel}>Phone / Telegram Contact</div>
                  <div className={styles.contactMethodValue}>089 555 672</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
