import React, { useState } from 'react';
import { Send, Mail, CheckCircle } from 'lucide-react';
import styles from './styles/ContactUs.module.css';

export default function ContactUs() {
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
        setError(data?.errors?.[0]?.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
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
            <Mail size={14} /> GET IN TOUCH
          </span>
          <h2 className={styles.headerTitle}>
            Contact <span>Us</span>
          </h2>
          <p className={styles.headerSub}>
            Have a question or want to learn more about T.A Coin? Send us a message and our team will get back to you shortly.
          </p>
        </div>

        {/* Card */}
        <div className={styles.formCard}>
          {submitted ? (
            <div className={styles.successContainer}>
              <CheckCircle size={56} color="var(--color-primary)" className={styles.successIcon} />
              <h3 className={styles.successTitle}>
                Message Sent!
              </h3>
              <p className={styles.successDesc}>
                Thank you for reaching out. We'll respond to <strong>{form.email}</strong> as soon as possible.
              </p>
              <button
                className={`btn btn-outline ${styles.resetButton}`}
                onClick={() => { setSubmitted(false); setForm({ email: '', message: '' }); }}
              >
                Send Another Message
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
                  Your Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className={styles.inputField}
                />
              </div>

              {/* Email */}
              <div>
                <label className={styles.inputLabel}>
                  Your Email Address
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
                    placeholder="yourname@email.com"
                    className={`${styles.inputField} ${styles.emailField}`}
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className={styles.inputLabel}>
                  Your Message
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="How can we help you?"
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Send Message
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
