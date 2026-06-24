import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Check } from 'lucide-react';
import styles from './styles/LanguageSwitcher.module.css';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'circle-flags:uk' },
  { code: 'km', label: 'ខ្មែរ', flag: 'circle-flags:kh' },
  { code: 'zh', label: '中文', flag: 'circle-flags:cn' },
];

export default function LanguageSwitcher({ variant = 'compact' }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) || LANGUAGES[0];

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const choose = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${variant === 'mobile' ? styles.mobile : ''}`}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('languageSwitcher.label')}
        title={current.label}
      >
        <Icon icon={current.flag} className={styles.flagIcon} />
        {variant === 'mobile' && <span className={styles.mobileLabel}>{current.label}</span>}
      </button>
      {open && (
        <ul className={styles.menu} role="listbox">
          {LANGUAGES.map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                role="option"
                aria-selected={current.code === lang.code}
                className={`${styles.option} ${current.code === lang.code ? styles.optionActive : ''}`}
                onClick={() => choose(lang.code)}
              >
                <Icon icon={lang.flag} className={styles.optionFlag} />
                <span className={styles.optionLabel}>{lang.label}</span>
                {current.code === lang.code && <Check size={14} className={styles.checkIcon} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
