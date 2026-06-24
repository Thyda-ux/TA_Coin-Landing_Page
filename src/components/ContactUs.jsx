import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Mail, CheckCircle } from 'lucide-react';
import styles from './styles/ContactUs.module.css';

export default function ContactUs() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.message) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://formspree.io/f/xwvryglw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, message: form.message }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data?.errors?.[0]?.message || t('contact.errorGeneric'));
      }
    } catch {
      setError(t('contact.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact-us" className={styles.contactSection}>
      {/* Decorative blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={`container ${styles.containerZ1}`}>
        {/* Header */}
        <div className={styles.headerDiv}>
          <span className={styles.getInTouchLabel}>
            <Mail size={14} /> {t('contact.label')}
          </span>
          <h2 className={styles.headerTitle}>
            {t('contact.titlePrefix')} <span>{t('contact.titleHighlight')}</span>
          </h2>
          <p className={styles.headerSub}>
            {t('contact.subtitle')}
          </p>
        </div>

        {/* Card */}
        <div className={styles.formCard}>
          {submitted ? (
            <div className={styles.successContainer}>
              <CheckCircle size={56} color="var(--color-primary)" className={styles.successIcon} />
              <h3 className={styles.successTitle}>
                {t('contact.successTitle')}
              </h3>
              <p className={styles.successDesc}>
                {t('contact.successDescPrefix')} <strong>{form.email}</strong> {t('contact.successDescSuffix')}
              </p>
              <button
                className={`btn btn-outline ${styles.resetButton}`}
                onClick={() => { setSubmitted(false); setForm({ email: '', message: '' }); }}
              >
                {t('contact.sendAnother')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.contactForm}>
              {error && (
                <div className={styles.errorAlert}>
                  {error}
                </div>
              )}
              {/* Name */}
              <div>
                <label className={styles.inputLabel}>
                  {t('contact.nameLabel')}
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder={t('contact.namePlaceholder')}
                  className={styles.inputField}
                />
              </div>

              {/* Email */}
              <div>
                <label className={styles.inputLabel}>
                  {t('contact.emailLabel')}
                </label>
                <div className={styles.emailInputWrapper}>
                  <Mail
                    size={16}
                    color="rgba(255,255,255,0.4)"
                    className={styles.emailIcon}
                  />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder={t('contact.emailPlaceholder')}
                    className={`${styles.inputField} ${styles.emailField}`}
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className={styles.inputLabel}>
                  {t('contact.messageLabel')}
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder={t('contact.messagePlaceholder')}
                  style={{ resize: 'vertical' }}
                  className={styles.inputField}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    {t('contact.sending')}
                  </>
                ) : (
                  <>
                    <Send size={18} /> {t('contact.sendMessage')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
