import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { askSupportBot } from '../lib/vectorService';
import { matchPredefinedResponse } from '../lib/predefinedResponses';
import { useAgentConnection } from './useAgentConnection';
import { validateSupportForm, buildSupportSummary, createSupportTicket } from '../lib/supportIntake';

export const CHAT_INACTIVITY_TIMEOUT_MINUTES = 20;
const CHAT_TIMEOUT_WARNING_MINUTES = 5;

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    text: 'Hi there. How can we help you today?',
    timestamp: null,
    options: ['FAQs', 'Connect to Agent'],
  },
];

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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(() => 
    INITIAL_MESSAGES.map(m => ({ ...m, timestamp: m.timestamp || new Date().toISOString() }))
  );
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
    userId: chatUserId,
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
            text: `⏱️ Your agent chat session was closed due to inactivity. The conversation has been saved. How else can I help you?`,
            timestamp: new Date().toISOString(),
            options: ['FAQs', 'Connect to Agent'],
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
        text: 'Choose a category or type your question.',
        timestamp: new Date().toISOString(),
        options: CATEGORY_OPTIONS,
      },
    ]);
  };

  const showCategoryFaqs = async (category) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_faqs')
        .select('question, answer, category')
        .eq('is_published', true)
        .eq('category', category)
        .order('question', { ascending: true });

      if (error) throw error;

      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: data?.length ? `Here are common ${category} questions:` : `No FAQs found for ${category}.`,
          timestamp: new Date().toISOString(),
          faqLinks: data || [],
        },
      ]);
    } catch (err) {
      setMessages((current) => [...current, { role: 'bot', text: `Error: ${err.message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const connectToAgent = async (description) => {
    try {
      setIsLoading(true);
      await startAgentSession(description);
      setMode('agent');
      setMessages((current) => [...current, { role: 'bot', text: '🔄 Connecting you to a live agent. Please wait...', timestamp: new Date().toISOString() }]);
    } catch (err) {
      setMessages((current) => [...current, { role: 'bot', text: `Error: ${err.message}`, timestamp: new Date().toISOString() }]);
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
        text: 'You have left the agent chat. How else can I help you?',
        timestamp: new Date().toISOString(),
        options: ['FAQs', 'Connect to Agent'],
      },
    ]);
  };

  const handleFileSelect = (file) => {
    if (!file) return false;
    if (file.size > 5 * 1024 * 1024) {
      setAttachError('Image must be smaller than 5 MB.');
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
      setAttachError(`Upload failed: ${err.message}`);
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
      setSupportFormError(Object.values(errors)[0] || 'Please complete all required fields.');
      return;
    }

    let ticketInfo = null;
    try {
      ticketInfo = await createSupportTicket(supabase, normalized, { source: 'chatbot', chatUserId });
    } catch (ticketErr) {
      console.warn("Could not save ticket record:", ticketErr);
    }

    const summary = ticketInfo
      ? `${buildSupportSummary(normalized)}\nTicket No: ${ticketInfo.ticket_no || ticketInfo.id}`
      : buildSupportSummary(normalized);

    setMessages((current) => [
      ...current,
      { role: 'user', text: `Submitted Ticket for: ${normalized.issueType}`, timestamp: new Date().toISOString() },
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
      setMessages((prev) => [...prev, { role: 'bot', text: `Support request failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOption = async (option, onShowForm) => {
    setMessages((current) => [...current, { role: 'user', text: option, timestamp: new Date().toISOString() }]);

    if (option === 'FAQs') {
      if (supportForm.active) {
        setSupportFormInlineFaq(true);
        if (onShowForm) onShowForm();
        return;
      }
      showFaqCategories();
      return;
    }

    if (CATEGORY_OPTIONS.includes(option)) {
      await showCategoryFaqs(option);
      return;
    }

    if (option === 'Connect to Agent') {
      setSupportForm({ ...getInitialSupportForm(), active: true });
      setSupportFormError('');
      setSupportFormInlineFaq(false);
      setMessages((prev) => [...prev, { role: 'bot', text: 'Please complete this support form so we can connect you to the right agent.', timestamp: new Date().toISOString() }]);
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
              text: 'Failed to send message. Please try again.',
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
          text: predefined.text,
          timestamp: new Date().toISOString(),
          options: predefined.options,
        },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const chatHistory = updatedMessages.slice(-6).map(m => ({ role: m.role, text: m.text }));
      const data = await askSupportBot(cleanMessage, chatHistory);

      if (data.action === "TRIGGER_ACCOUNT_UI") {
        setMessages((current) => [
          ...current,
          { 
            role: 'bot', 
            text: data.text, 
            timestamp: new Date().toISOString(), 
            options: ['Go to Account Settings'] 
          },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          { 
            role: 'bot', 
            text: data.text, 
            timestamp: new Date().toISOString() 
          },
        ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: "I'm having trouble searching our knowledge base right now. Would you like to connect to an agent?",
          timestamp: new Date().toISOString(),
          options: ['Connect to Agent'],
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
