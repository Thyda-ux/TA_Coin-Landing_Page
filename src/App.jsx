import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Whyus from './components/Whyus';
import Story from './components/Story';
import Sustainability from './components/Sustainability';
import Careers from './components/Careers';
import News from './components/News';
import Footer from './components/Footer';
import ContactUs from './components/ContactUs';
import Jobs from './components/Jobs';
import AllNews from './components/AllNews';
import NewsDetail from './components/NewsDetail';
import TacPrivacy from './components/TacPrivacy';
import TacTerms from './components/TacTerms';
import Disclaimer from './components/Disclaimer';
import BackToTop from './components/BackToTop';
import HomePopup from './components/HomePopup';
import ChatBot from './components/ChatBot';
import { useRealtimeFaqs } from './hooks/useRealtimeFaqs';

function Home() {
  return (
    <>
      <Hero />
      <Story />
      <Whyus />
      <Sustainability />
      <Careers />
      <News />
      <ContactUs />
      <HomePopup />
    </>
  );
}

function App() {
  const location = useLocation();

  // Subscribe to FAQ changes — auto-updates vector embeddings when admin edits FAQs
  useRealtimeFaqs();

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/news" element={<AllNews />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/privacy-policy" element={<TacPrivacy />} />
          <Route path="/terms-of-use" element={<TacTerms />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
        </Routes>
      </main>
      <Footer />
      <BackToTop />
      <ChatBot />
    </>
  );
}

export default App;
