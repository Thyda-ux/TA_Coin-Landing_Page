import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { askSupportBot } from '../lib/vectorService';
import { matchPredefinedResponse } from '../lib/predefinedResponses';
import { smartSearchFaqs, HIGH_CONFIDENCE } from '../lib/smartSearch';
import { useAgentConnection } from './useAgentConnection';
import { validateSupportForm, buildSupportSummary, createSupportTicket } from '../lib/supportIntake';

export const CHAT_INACTIVITY_TIMEOUT_MINUTES = 20;
const CHAT_TIMEOUT_WARNING_MINUTES = 5;

// Option buttons carry a stable `id` (logic) plus a localized `label` (display).
const baseOptions = (t) => [
  { id: 'faqs', label: t('chatbot.opt.faqs') },
  { id: 'agent', label: t('chatbot.opt.connectToAgent') },
];

const getInitialMessages = (t) => [
  {
    role: 'bot',
    text: t('chatbot.bot.greeting'),
    timestamp: new Date().toISOString(),
    options: baseOptions(t),
  },
];

// Canonical English category keys — used for the DB query AND as the option id.
// The display label is localized via t(`chatbot.cat.${key}`).
export const CATEGORY_OPTIONS = [
  'Getting Started',
  'Account & App',
  'Payments & Wallet',
  'Security',
  'Support',
  'Careers',
  'Legal',
];

export const ISSUE_TYPE_OPTIONS = [
  'Account Issue',
  'General Enquiry',
  'KYC / Verification Issue',
  'Login Issue',
  'OTP Issue',
  'P2P Dispute',
  'P2P Issue',
  'Technical Support',
  'Transaction Issue',
  'Voucher / Coupon Issue',
  'Withdrawal Issue',
];

export const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg';

const getInitialSupportForm = () => ({
  active: false,
  name: '',
  email: '',
  phone: '',
  issueType: ISSUE_TYPE_OPTIONS[0],
  issueDetails: '',
});

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const useChatSession = (isOpen) => {
  const { t, i18n } = useTranslation();
  // Normalize to a base language code ('en-US' -> 'en'); always one of en/km/zh.
  const lang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  // Localized [FAQs, Connect to Agent] option set, rebuilt for the current language.
  const opts = () => baseOptions(t);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(() => getInitialMessages(t));
  const [supportForm, setSupportForm] = useState(getInitialSupportForm);
  const [supportFormError, setSupportFormError] = useState('');
  const [supportFormInlineFaq, setSupportFormInlineFaq] = useState(false);
  const [mode, setMode] = useState('bot');

  const [pendingImage, setPendingImage] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [remainingInactivityMs, setRemainingInactivityMs] = useState(null);

  const {
    connectToAgent: startAgentSession,
    sendMessage: sendAgentMessage,
    sendImage: sendAgentImage,
    disconnect: disconnectAgent,
    isWaiting: agentWaiting,
    agentJoined,
    sessionTimedOut,
    inactivityDeadline,
    messages: agentMessages,
  } = useAgentConnection({ inactivityTimeoutMinutes: CHAT_INACTIVITY_TIMEOUT_MINUTES });

  const clearPendingImage = useCallback(() => {
    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
    setAttachError('');
  }, [pendingImage]);

  useEffect(() => {
    if (sessionTimedOut && mode === 'agent') {
      const timer = setTimeout(() => {
        disconnectAgent();
        clearPendingImage();
        setMode('bot');
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: t('chatbot.bot.timedOut'),
            timestamp: new Date().toISOString(),
            options: opts(),
          },
        ]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sessionTimedOut, mode, disconnectAgent, clearPendingImage]);

  useEffect(() => {
    if (!inactivityDeadline || mode !== 'agent' || sessionTimedOut || !isOpen) {
      setRemainingInactivityMs(null);
      return;
    }
    const updateRemaining = () => {
      setRemainingInactivityMs(Math.max(0, inactivityDeadline - Date.now()));
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [inactivityDeadline, mode, sessionTimedOut, isOpen]);

  useEffect(() => {
    return () => {
      if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    };
  }, [pendingImage]);

  const showFaqCategories = () => {
    setMessages((current) => [
      ...current,
      {
        role: 'bot',
        text: t('chatbot.bot.chooseCategory'),
        timestamp: new Date().toISOString(),
        options: CATEGORY_OPTIONS.map((key) => ({ id: key, label: t(`chatbot.cat.${key}`) })),
      },
    ]);
  };

  // Pick the question/answer in the active language, falling back to English.
  const localizeFaq = (f) => {
    const q = lang === 'km' ? f.question_km : lang === 'zh' ? f.question_zh : null;
    const a = lang === 'km' ? f.answer_km : lang === 'zh' ? f.answer_zh : null;
    return {
      question: (q && q.trim()) ? q : f.question,
      answer: (a && a.trim()) ? a : f.answer,
    };
  };

  const showCategoryFaqs = async (category) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_faqs')
        .select('question, answer, question_km, answer_km, question_zh, answer_zh, category')
        .eq('is_published', true)
        .eq('category', category)
        .order('question', { ascending: true });

      if (error) throw error;

      const catLabel = t(`chatbot.cat.${category}`);
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: data?.length ? t('chatbot.bot.categoryIntro', { category: catLabel }) : t('chatbot.bot.categoryNone', { category: catLabel }),
          timestamp: new Date().toISOString(),
          faqLinks: (data || []).map(localizeFaq),
        },
      ]);
    } catch (err) {
      setMessages((current) => [...current, { role: 'bot', text: t('chatbot.bot.searchError'), timestamp: new Date().toISOString(), options: opts() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const connectToAgent = async (description, customerInfo = {}) => {
    try {
      setIsLoading(true);
      await startAgentSession(description, customerInfo);
      setMode('agent');
      setMessages((current) => [...current, { role: 'bot', text: t('chatbot.bot.connecting'), timestamp: new Date().toISOString() }]);
    } catch (err) {
      if (import.meta.env?.DEV) console.error('Failed to connect to agent:', err);
      setMessages((current) => [...current, { role: 'bot', text: t('chatbot.bot.searchError'), timestamp: new Date().toISOString(), options: opts() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const backToBot = () => {
    disconnectAgent();
    clearPendingImage();
    setMode('bot');
    setMessages((prev) => [
      ...prev,
      {
        role: 'bot',
        text: t('chatbot.bot.leftAgent'),
        timestamp: new Date().toISOString(),
        options: opts(),
      },
    ]);
  };

  const handleFileSelect = (file) => {
    if (!file) return false;
    if (file.size > 5 * 1024 * 1024) {
      setAttachError(t('chatbot.attach.tooLarge'));
      return false;
    }
    setAttachError('');
    if (pendingImage?.preview) {
      URL.revokeObjectURL(pendingImage.preview);
    }
    setPendingImage({ file, preview: URL.createObjectURL(file) });
    return true;
  };

  const sendPendingImageInternal = async () => {
    if (!pendingImage?.file || isUploading) return;
    setIsUploading(true);
    setAttachError('');
    try {
      await sendAgentImage(pendingImage.file);
      clearPendingImage();
    } catch (err) {
      setAttachError(t('chatbot.attach.uploadFailed', { message: err.message }));
    } finally {
      setIsUploading(false);
    }
  };

  const resetSupportForm = () => {
    setSupportForm(getInitialSupportForm());
    setSupportFormError('');
    setSupportFormInlineFaq(false);
  };

  const submitSupportForm = async (e) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    setSupportFormError('');
    const { normalized, isValid, errors } = validateSupportForm(supportForm);

    if (!isValid) {
      setSupportFormError(Object.values(errors)[0] || t('chatbot.bot.completeFields'));
      return;
    }

    let ticketInfo = null;
    try {
      ticketInfo = await createSupportTicket(supabase, normalized);
    } catch (ticketErr) {
      if (import.meta.env?.DEV) console.warn('Could not save ticket record:', ticketErr);
    }

    const summary = ticketInfo
      ? `${buildSupportSummary(normalized)}\nTicket No: ${ticketInfo.ticket_no || ticketInfo.id}`
      : buildSupportSummary(normalized);

    const issueLabel = t(`chatbot.issue.${normalized.issueType}`, normalized.issueType);
    setMessages((current) => [
      ...current,
      { role: 'user', text: t('chatbot.bot.submittedTicket', { type: issueLabel }), timestamp: new Date().toISOString() },
    ]);

    setIsLoading(true);
    try {
      // Hand the structured form fields to the connection layer so the agent
      // dashboard can show them in its Customer Information panel. The
      // summary text is still sent as the first transcript message; this is
      // additional metadata, not a replacement.
      await connectToAgent(summary, {
        customerName: normalized.name || '',
        email: normalized.email || '',
        phone: normalized.phone || '',
        issueType: normalized.issueType || '',
        issueDescription: normalized.issueDetails || '',
      });
      resetSupportForm();
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'bot', text: t('chatbot.bot.supportFailed', { message: err.message }), timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  // `option` is { id, label }. Switch on the stable id; show the localized label.
  const handleOption = async (option, onShowForm) => {
    const id = option?.id;
    setMessages((current) => [...current, { role: 'user', text: option?.label ?? '', timestamp: new Date().toISOString() }]);

    if (id === 'faqs') {
      if (supportForm.active) {
        setSupportFormInlineFaq(true);
        if (onShowForm) onShowForm();
        return;
      }
      showFaqCategories();
      return;
    }

    // Category options carry the canonical English category name as their id.
    if (CATEGORY_OPTIONS.includes(id)) {
      await showCategoryFaqs(id);
      return;
    }

    if (id === 'agent') {
      setSupportForm({ ...getInitialSupportForm(), active: true });
      setSupportFormError('');
      setSupportFormInlineFaq(false);
      setMessages((prev) => [...prev, { role: 'bot', text: t('chatbot.bot.supportFormPrompt'), timestamp: new Date().toISOString() }]);
      if (onShowForm) onShowForm();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanMessage = input.trim();

    // AGENT MODE: Handle image + message sequentially
    if (mode === 'agent') {
      if (!cleanMessage && !pendingImage?.file) return;

      // Step 1: Send pending image first (if exists)
      if (pendingImage?.file) {
        try {
          await sendPendingImageInternal();
        } catch (err) {
          console.error('Image send failed:', err);
          // Continue to message even if image fails
        }
      }

      // Step 2: Send message (if not empty)
      if (cleanMessage) {
        setInput('');
        try {
          await sendAgentMessage(cleanMessage);
        } catch (err) {
          console.error('Failed to send message:', err);
          setMessages((current) => [
            ...current,
            {
              role: 'bot',
              text: t('chatbot.bot.sendFailed'),
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
      return;
    }

    // BOT MODE: Process user message
    if (!cleanMessage || isLoading) return;
    setInput('');

    const updatedMessages = [...messages, { role: 'user', text: cleanMessage, timestamp: new Date().toISOString() }];
    setMessages(updatedMessages);

    // Pre-embedded responses (greetings, thanks, goodbye, agent requests).
    // Short-circuits before the edge function so common chatter is instant
    // and costs no Gemini quota.
    const predefined = matchPredefinedResponse(cleanMessage);
    if (predefined) {
      if (predefined.action === 'OPEN_SUPPORT_FORM') {
        setSupportForm({ ...getInitialSupportForm(), active: true });
        setSupportFormError('');
        setSupportFormInlineFaq(false);
      }
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: t(`chatbot.predefined.${predefined.intent}`),
          timestamp: new Date().toISOString(),
          options: predefined.withOptions ? opts() : undefined,
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      // Fast-path: deterministic intent/keyword match against the in-memory
      // FAQ cache. Skips the Gemini round-trip entirely for the ~50 known
      // intents (free, instant, deterministic).
      //
      // English only: smartSearchFaqs strips non-ASCII characters when it
      // extracts keywords, so Khmer/Chinese queries would produce no keywords
      // and match nothing. For those languages we skip straight to the RAG
      // edge function, which retrieves against the English knowledge base and
      // generates the answer in the user's language (preferring a stored
      // translation when the matched FAQ has one).
      if (lang === 'en') {
        const hits = await smartSearchFaqs(cleanMessage);
        if (hits.length > 0 && hits[0].score >= HIGH_CONFIDENCE) {
          const top = hits[0];
          const related = hits.slice(1, 4).map(h => ({
            question: h.question,
            answer: h.answer,
          }));
          setMessages((current) => [
            ...current,
            {
              role: 'bot',
              text: top.answer,
              timestamp: new Date().toISOString(),
              faqLinks: related.length > 0 ? related : undefined,
            },
          ]);
          return;
        }
      }

      // Fallback (and primary path for km/zh): RAG edge function. Passes the
      // active language so the edge function answers in kind.
      const chatHistory = updatedMessages.slice(-6).map(m => ({ role: m.role, text: m.text }));
      const data = await askSupportBot(cleanMessage, chatHistory, lang);

      // Server-reported low confidence → offer agent escalation instead of
      // confidently presenting a weak match.
      if (data.confidence != null && data.confidence < 0.6) {
        setMessages((current) => [
          ...current,
          {
            role: 'bot',
            text: data.text || t('chatbot.bot.lowConfidence'),
            timestamp: new Date().toISOString(),
            options: opts(),
          },
        ]);
        return;
      }

      if (data.action === "TRIGGER_ACCOUNT_UI") {
        setMessages((current) => [
          ...current,
          {
            role: 'bot',
            text: data.text,
            timestamp: new Date().toISOString(),
            options: [{ id: 'account_settings', label: t('chatbot.opt.goToAccountSettings') }],
          },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          {
            role: 'bot',
            text: data.text,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      if (import.meta.env?.DEV) console.error('Chat error:', error);
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: t('chatbot.bot.searchError'),
          timestamp: new Date().toISOString(),
          options: [{ id: 'agent', label: t('chatbot.opt.connectToAgent') }],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const timeoutWarningThresholdMs = Math.max(0, (CHAT_TIMEOUT_WARNING_MINUTES || 0) * 60 * 1000);
  const showTimeoutWarning = mode === 'agent' && agentJoined && !sessionTimedOut && remainingInactivityMs > 0 && remainingInactivityMs <= timeoutWarningThresholdMs;

  return {
    input, setInput,
    isLoading,
    messages, setMessages,
    supportForm, setSupportForm,
    supportFormError,
    supportFormInlineFaq,
    mode,
    pendingImage,
    isUploading,
    attachError, setAttachError,
    lightboxUrl, setLightboxUrl,
    remainingInactivityMs,
    agentWaiting,
    agentJoined,
    sessionTimedOut,
    agentMessages,
    showTimeoutWarning,
    handleSubmit,
    handleOption,
    submitSupportForm,
    backToBot,
    handleFileSelect,
    clearPendingImage,
    resetSupportForm
  };
};
