import React, { useEffect } from 'react';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import styles from './styles/LegalPage.module.css';

export default function TacTerms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>Terms and Conditions</h1>
          <p className={styles.lastUpdated}>Effective Date: 19 February 2026</p>
        </header>

        <div className={styles.card}>
          <section className={styles.section}>
            <p><strong>T.A COIN CO., LTD.</strong></p>
            <p>Welcome to T.A Coin. These Terms and Conditions govern your use of our digital platform and services.</p>
          </section>

          <section className={styles.section}>
            <h2>1. Definitions and Interpretation</h2>
            <ul>
              <li><strong>1.1 Company:</strong> T.A Coin Co., Ltd. ("T.A Coin", "we", "us", "our"), a company organized under the laws of the Kingdom of Cambodia.</li>
              <li><strong>1.2 Platform:</strong> The websites, mobile applications (iOS/Android), APIs, and other digital channels operated by T.A Coin.</li>
              <li><strong>1.3 Services:</strong> The technology platform and related features enabling Users to access digital asset services.</li>
              <li><strong>1.4 User:</strong> ("you", "your") Any natural person or legal entity that registers an account or accesses the Services.</li>
              <li><strong>1.5 Digital Assets:</strong> Cryptographic tokens, coins, stablecoins, and other digital representations of value.</li>
              <li><strong>1.6 Applicable Law:</strong> All laws, sub-decrees, prakas, and regulations of Cambodia.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. Acceptance of Terms</h2>
            <p>2.1 By accessing or using the Platform, you acknowledge that these Terms constitute a binding legal agreement between you and T.A Coin.</p>
            <p>2.2 T.A Coin acts solely as a technology platform and marketplace facilitator. We do not act as your broker, agent, or investment adviser.</p>
          </section>

          <section className={styles.section}>
            <h2>3. Corporate Information</h2>
            <p>3.1 T.A Coin Co., Ltd. was incorporated in Cambodia, registered at the Ministry of Commerce under registration number 1000502187, dated 30 May 2025.</p>
          </section>

          <section className={styles.section}>
            <h2>4. Regulatory Status & Investor Eligibility</h2>
            <p><strong>4.1 SERC Regulatory Sandbox:</strong> T.A Coin operates under the Regulatory Sandbox of the Securities and Exchange Regulator of Cambodia (SERC).</p>
            <p><strong>4.2 Qualified Investor Requirement:</strong> By using the Platform, you confirm that you are a Qualified Investor as defined under applicable SERC prakas.</p>
          </section>

          <section className={styles.section}>
            <h2>5. Scope of Services</h2>
            <p>5.1 The Platform may include Peer-to-Peer (P2P) Trading, Online Purchase of Properties/Goods/Services, Loyalty Programs, and Biometric Login.</p>
            <p>5.2 <strong>No Lending:</strong> T.A Coin does not provide loans or credit facilities.</p>
          </section>

          <section className={styles.section}>
            <h2>6. Third-Party Service Providers</h2>
            <p>6.1 T.A Coin engages third-party processors and service providers (cloud providers, KYC vendors, etc.) to deliver the Services.</p>
            <p>6.5 <strong>No Liability for Third Parties:</strong> T.A Coin shall not be liable for losses arising from acts or omissions of independent third-party service providers.</p>
          </section>

          <section className={styles.section}>
            <h2>7. Eligibility and Legal Capacity</h2>
            <p>7.1 You warrant that you are at least 18 years old, have legal capacity, and are not subject to sanctions.</p>
          </section>

          <section className={styles.section}>
            <h2>8. Account Registration and Security</h2>
            <p>8.1 You must provide accurate information and safeguard your credentials. You consent to receive communications electronically.</p>
          </section>

          <section className={styles.section}>
            <h2>9. User Conduct</h2>
            <p>9.1 You shall not engage in fraud, market manipulation, or use automated tools to disrupt the Platform.</p>
          </section>

          <section className={styles.section}>
            <h2>11. Risk Disclosure</h2>
            <p>11.1 Digital Assets are highly volatile and may lose value rapidly. You acknowledge that blockchain transactions may be irreversible.</p>
          </section>

          <section className={styles.section}>
            <h2>12. AML/KYC Compliance</h2>
            <p>12.1 T.A Coin complies with the AML/CFT Law 2020 and implementing instruments. Users must complete identity verification (CDD).</p>
          </section>

          <section className={styles.section}>
            <h2>13. Privacy</h2>
            <p>13.1 T.A Coin processes personal data to provide Services, perform KYC/AML obligations, and ensure security.</p>
          </section>

          <section className={styles.section}>
            <h2>19. Limitation of Liability</h2>
            <p>19.1 To the maximum extent permitted by law, T.A Coin shall not be liable for indirect, incidental, or consequential damages.</p>
          </section>

          <section className={styles.section}>
            <h2>24. Governing Law and Dispute Resolution</h2>
            <p>24.1 These Terms are governed by the laws of the Kingdom of Cambodia.</p>
            <p>24.2 Any dispute shall be finally resolved by arbitration administered by the NCAC under the NCAC Arbitration Rules (2021) in Phnom Penh.</p>
          </section>

          <section className={styles.section}>
            <h2>Contact Information</h2>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Phone className={styles.contactIcon} size={20} />
                <span>+855 71 345 8888</span>
              </div>
              <div className={styles.contactItem}>
                <Mail className={styles.contactIcon} size={20} />
                <span>customersupport@tacointrade.com</span>
              </div>
              <div className={styles.contactItem}>
                <ExternalLink className={styles.contactIcon} size={20} />
                <a href="https://t.me/tacustomersupport" target="_blank" rel="noopener noreferrer">Telegram Support</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
