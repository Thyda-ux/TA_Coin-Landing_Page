import React from 'react';
import { Lightbulb, Coins, FileText, Handshake, HandCoins } from 'lucide-react';
import styles from './styles/Whyus.module.css';

export default function Whyus() {
  const cards = [
    {
      title: "Full Know-how of the Financial Industry",
      icon: <Lightbulb size={32} color="#0f172a" />,
      content: (
        <p className={styles.cardText}>
          The shareholders, directors and management team of the T.A Coin have an in-depth industry knowledge in crypto-asset and financial services sectors. We provide confidence to investors in safeguarding and managing their investment assets with professional and care.
        </p>
      ),
    },
    {
      title: "Crypto-asset Exposure",
      icon: <Coins size={32} color="#0f172a" />,
      content: (
        <ul className={styles.cardList}>
          <li className={styles.cardListItem}>Creating the accessibility of the crypto-asset investment available from the local and reputational company with peg values tied to assets in Cambodia as required by law.</li>
          <li className={styles.cardListItem}>Opportunity for investors who plan to diversify their portfolios to include crypto-asset investment.</li>
        </ul>
      ),
    },
    {
      title: "Full Disclosures",
      icon: <FileText size={32} color="#0f172a" />,
      content: (
        <ul className={styles.cardList}>
          <li className={styles.cardListItem}>Annual financial audits reports will be published online after it has been approved by the Audit Committee and the Board of Directors.</li>
          <li className={styles.cardListItem}>The peg values report will be available online after certified by the independent party designated by the Board of Directors.</li>
        </ul>
      ),
    },
    {
      title: "Regulatory Compliance and Professionalism",
      icon: <Handshake size={32} color="#0f172a" />,
      content: (
        <ul className={styles.cardList}>
          <li className={styles.cardListItem}>In addition to the regulatory bodies, our internal Compliance Team ensures full compliance in every aspect of the business.</li>
          <li className={styles.cardListItem}>Our expertise follows the industry professionals in securing the transactions and investments of the clients by clarifying any potential risk that may relate to their portfolios and ensure they are well-informed before joining us.</li>
          <li className={styles.cardListItem}>Investor's assets are securely stored and re-invested in legitimate, viable and high credit projects in Cambodia.</li>
          <li className={styles.cardListItem}>We are the first qualified Coin Issuer and Crypto-asset Service Providers (CASPs) licensing by the National Bank of Cambodia (the NBC) and the approval from the Cambodia Securities Exchange (CSX).</li>
        </ul>
      ),
      className: styles.cardWide
    },
    {
      title: "Profit Sharing",
      icon: <HandCoins size={32} color="#0f172a" />,
      content: (
        <p className={styles.cardText}>
          Profits from investment will be shared among investors as a form of Coin incentives or Coin dividends.
        </p>
      ),
    }
  ];

  return (
    <section id="why-us" className={`section-padding ${styles.whyusSection}`}>
      <div className="container">

        <div className={styles.headerDiv}>
          <h2 className={styles.mainTitle}>
            Why Choose T.A Coin Investments?
          </h2>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${styles.gridContainer}`}>
          {cards.map((card, index) => (
            <div key={index} className={`${styles.whyCard} ${card.className || ''}`}>

              <div className={styles.iconWrapper}>
                {card.icon}
                <div className={styles.iconAccent}></div>
              </div>

              <h3 className={styles.cardTitle}>
                {card.title}
              </h3>

              {card.content}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
