import React, { useEffect } from 'react';
import { Mail, Phone, ExternalLink } from 'lucide-react';
import styles from './styles/LegalPage.module.css';

export default function TacPrivacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        <header className={styles.header}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Effective Date: July 10th, 2025</p>
        </header>

        <div className={styles.card}>
          <section className={styles.section}>
            <p>
              This Privacy Policy describes how T.A COIN CO., LTD. ("TA COIN") collects, uses, stores, and protects your personal information when you use our platform (Mobile App or/and Web App). We are committed to protecting your privacy and handling your data responsibly.
            </p>
            <p>
              You are required to carefully read this document and accepted it. If you do not agree with this Privacy Policy, then you must refrain from using our Web App (website), Mobile App and/or Services or registering an Account with us. This Privacy Policy is an integral part of our Terms of Use.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Acceptance of the Privacy Policy Terms</h2>
            <p>
              By using our Web App (website), Mobile App and signing in/up for our services, clicking the confirm-checkbox, you provide us an explicit consent to terms and the data practices described in this Policy and in the Terms of Use including the processing, storage, and usage of your personal data.
            </p>
            <p>
              From time to time, TA COIN may revise and update this Privacy Policy to reflect changes in legislation or review our personal data collection and processing practices. If any changes, amendments and additions are made to this Privacy Policy, they would come into force and be applied immediately after they are published on the Website.
            </p>
          </section>

          <section className={styles.section}>
            <h2>1. Introduction to Our Privacy Commitment</h2>
            <p>
              In the TA Coin Platforms (App & Web App), we understand the importance of your personal privacy. In accordance with Cambodia's regulatory requirements and our internal policies, we are dedicated to adhering to the spirit of privacy protection. This policy aims to be transparent about our data practices and empower you to make informed decisions about your information.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Information We Collect</h2>
            <p>We may collect various types of information from and about you when you use our TA Coin platforms (App & WebApp), depending on the features you use.</p>
            
            <h3>2.1. Information You Provide Directly to Us</h3>
            <ul>
              <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, phone number, and a secure password.</li>
              <li><strong>Identity Verification Information (KYC-Know Your Customer):</strong> To comply with financial regulations and prevent fraud, we may require you to provide government-issued identification documents (e.g., National ID card, passport), your photograph (including a "selfie" for liveness detection), and other relevant identification details.</li>
              <li><strong>Financial Information:</strong> This may include bank account details, mobile money account details, and transaction history within the App/Web App.</li>
              <li><strong>Communication Information:</strong> Records of your communications with us, such as customer support inquiries, disputes resolution inquiries and so on.</li>
              <li><strong>User Content:</strong> Any information you submit through the App/Web App, such as feedback or participation in surveys, campaigns and others.</li>
            </ul>

            <h3>2.2. Information We Collect Automatically</h3>
            <ul>
              <li><strong>Device Information:</strong> We collect information about your mobile device, including the device model, operating system version, unique device identifiers, mobile network information, and crash data.</li>
              <li><strong>Usage Data:</strong> We collect information about how you use the App/Web App, such as the features you access, the time and date of your activities, and app crashes.</li>
              <li><strong>Location Information:</strong> With your explicit consent, we may collect precise or approximate location information from your mobile/tablet device.</li>
              <li><strong>Log Data:</strong> Standard log data, including IP address, browser type, and referring/exit pages.</li>
              <li><strong>Transaction information:</strong> Information and balance of the trading, deposit, withdrawal, and other transactions.</li>
            </ul>

            <h3>2.3. Information from Third Parties</h3>
            <p>We may receive information about you from third-party service providers (e.g., identity verification services, payment processors) when necessary to provide our services.</p>
          </section>

          <section className={styles.section}>
            <h2>3. How We Use Your Information</h2>
            <ul>
              <li>To Provide and Maintain Our Services</li>
              <li>For Security, Fraud Prevention, AML and CTF</li>
              <li>For Customer Support</li>
              <li>For Communication</li>
              <li>For Legal and Regulatory Compliance</li>
              <li>For Analytics and Research</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>4. How We Share Your Information</h2>
            <ul>
              <li>With Your Consent</li>
              <li>Service Providers</li>
              <li>Legal Requirements and Law Enforcement</li>
              <li>Business Transfers</li>
              <li>Aggregated or Anonymized Data</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>5. Data Retention</h2>
            <p>We will retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.</p>
          </section>

          <section className={styles.section}>
            <h2>6. Data Security</h2>
            <p>We implement reasonable technical and organizational measures to protect your personal information, including encryption, access controls, regular security audits, and employee training.</p>
          </section>

          <section className={styles.section}>
            <h2>7. Your Rights</h2>
            <ul>
              <li>Right to be Informed</li>
              <li>Right to Access</li>
              <li>Right to Rectification</li>
              <li>Right to Object</li>
              <li>Withdrawal of Consent</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>8. Children's Privacy</h2>
            <p>TA Coin Platforms are not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children under 18.</p>
          </section>

          <section className={styles.section}>
            <h2>9. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated Privacy Policy on our App/WebApp.</p>
          </section>

          <section className={styles.section}>
            <h2>10. Contact Us</h2>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Phone className={styles.contactIcon} size={20} />
                <span>(+855) 71 345 8888</span>
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
