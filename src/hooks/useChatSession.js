import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { askSupportBot } from '../lib/vectorService';

// ─── Constants & Helpers ──────────────────────────────────────────
export const ISSUE_TYPE_OPTIONS = [
  'Account Issue', 'General Enquiry', 'KYC / Verification Issue', 'Login Issue',
  'OTP Issue', 'P2P Dispute', 'P2P Issue', 'Technical Support', 'Transaction Issue',
  'Voucher / Coupon Issue', 'Withdrawal Issue'
];

export const CATEGORY_OPTIONS = [
  'Getting Started', 'Account & App', 'Payments & Wallet', 'Security',
  'Support', 'Careers', 'Legal'
];

export const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg';

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const INITIAL_MESSAGES = [
  { role: 'bot', text: 'Hi there. How can we help you today?', options: ['FAQs', 'Connect to Agent'] }
];

const getInitialSupportForm = () => ({
  active: false, name: '', email: '', phone: '', issueType: ISSUE_TYPE_OPTIONS[0], issueDetails: ''
});

// ─── Main Hook ────────────────────────────────────────────────────
export function useChatSession(isOpen) {
  // UI State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('bot'); // 'bot' | 'agent'
  
  // Bot State
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [supportForm, setSupportForm] = useState(getInitialSupportForm());
  const [supportFormError, setSupportFormError] = useState('');
  
  // Agent State
  const [agentMessages, setAgentMessages] = useState([]);
  const [agentJoined, setAgentJoined] = useState(false);
  const [agentWaiting, setAgentWaiting] = useState(false);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const [inactivityDeadline, setInactivityDeadline] = useState(null);
  const [channel, setChannel] = useState(null);
  const [userId] = useState(`user_${Math.random().toString(36).substring(2, 9)}`);
  
  // Attachment State
  const [pendingImage, setPendingImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [remainingInactivityMs, setRemainingInactivityMs] = useState(null);

  // ─── Agent Timeout Logic ────────────────────────────────────────
  const refreshTimeout = useCallback(() => {
    setInactivityDeadline(Date.now() + 20 * 60 * 1000); // 20 minutes
    setSessionTimedOut(false);
  }, []);

  useEffect(() => {
    if (!inactivityDeadline || mode !== 'agent' || sessionTimedOut) {
      setRemainingInactivityMs(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, inactivityDeadline - Date.now());
      setRemainingInactivityMs(remaining);
      if (remaining === 0) setSessionTimedOut(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [inactivityDeadline, mode, sessionTimedOut]);

  // ─── Bot Actions ────────────────────────────────────────────────
  const handleOption = async (option, focusSupportForm) => {
    setMessages(prev => [...prev, { role: 'user', text: option }]);

    if (option === 'FAQs') {
      if (supportForm.active && focusSupportForm) {
        focusSupportForm();
        return;
      }
      setMessages(prev => [...prev, { role: 'bot', text: 'Choose a category:', options: CATEGORY_OPTIONS }]);
      return;
    }

    if (CATEGORY_OPTIONS.includes(option)) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('support_faqs')
          .select('question, answer, category')
          .eq('is_published', true)
          .eq('category', option);
        if (error) throw error;
        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: data?.length ? `Here are common ${option} questions:` : `No FAQs found for ${option}.`,
          faqLinks: data || [] 
        }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: 'bot', text: `Error: ${err.message}` }]);
      }
      setIsLoading(false);
      return;
    }

    if (option === 'Connect to Agent') {
      setSupportForm({ ...getInitialSupportForm(), active: true });
      setMessages(prev => [...prev, { role: 'bot', text: 'Please complete this form to connect to an agent.' }]);
      if (focusSupportForm) setTimeout(focusSupportForm, 100);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanMessage = input.trim();
    if (!cleanMessage) return;

    if (mode === 'agent') {
      // Send Agent Message
      if (sessionTimedOut) return;
      setInput('');
      const msgPayload = { id: crypto.randomUUID(), sender_role: 'user', content: cleanMessage, created_at: new Date().toISOString() };
      setAgentMessages(prev => [...prev, msgPayload]);
      refreshTimeout();
      if (channel) await channel.send({ type: 'broadcast', event: 'new_message', payload: msgPayload });
      return;
    }

    // Agentic RAG Bot Flow
    if (isLoading) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', text: cleanMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const history = newMessages.slice(-6).map(m => ({ role: m.role, text: m.text }));
      const response = await askSupportBot(cleanMessage, history);
      
      if (response.action === "TRIGGER_ACCOUNT_UI") {
        setMessages(prev => [...prev, { role: 'bot', text: response.text, options: ['Go to Account Settings'] }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: response.text }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: "I'm having trouble connecting to our knowledge base. Would you like to connect to an agent?",
        options: ['Connect to Agent']
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Support Form & Agent Connect ───────────────────────────────
  const resetSupportForm = () => {
    setSupportForm(getInitialSupportForm());
    setSupportFormError('');
  };

  const submitSupportForm = async (e) => {
    e.preventDefault();
    if (!supportForm.name || !supportForm.email || !supportForm.phone) {
      setSupportFormError('Please fill in all required fields.');
      return;
    }
    
    setSupportFormError('');
    setIsLoading(true);
    setMode('agent');
    setAgentWaiting(true);
    resetSupportForm();
    refreshTimeout();

    const roomName = `support_room_${userId}`;
    const newChannel = supabase.channel(roomName);

    newChannel
      .on('broadcast', { event: 'agent_joined' }, () => { setAgentJoined(true); setAgentWaiting(false); })
      .on('broadcast', { event: 'new_message' }, (payload) => { setAgentMessages(prev => [...prev, payload.payload]); refreshTimeout(); })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await supabase.from('support_queue').insert({
            user_id: userId,
            issue: `[${supportForm.issueType}] ${supportForm.issueDetails}`,
            room: roomName,
            status: 'waiting'
          });
        }
      });
    
    setChannel(newChannel);
    setIsLoading(false);
  };

  const backToBot = () => {
    if (channel) channel.unsubscribe();
    setChannel(null);
    setAgentJoined(false);
    setAgentWaiting(false);
    setAgentMessages([]);
    setMode('bot');
    setMessages(prev => [...prev, { role: 'bot', text: 'You left the live chat. How else can I help?', options: ['FAQs', 'Connect to Agent'] }]);
  };

  // ─── Attachments ────────────────────────────────────────────────
  const handleFileSelect = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      setAttachError('Image must be smaller than 5 MB.');
      return false;
    }
    setAttachError('');
    setPendingImage({ file, preview: URL.createObjectURL(file) });
    return true;
  };

  const clearPendingImage = useCallback(() => {
    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
    setAttachError('');
  }, [pendingImage]);

  return {
    input, setInput,
    isLoading,
    messages, setMessages,
    supportForm, setSupportForm,
    supportFormError,
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
    showTimeoutWarning: mode === 'agent' && agentJoined && !sessionTimedOut && remainingInactivityMs > 0 && remainingInactivityMs <= 300000,
    handleSubmit,
    handleOption,
    submitSupportForm,
    backToBot,
    handleFileSelect,
    clearPendingImage,
    resetSupportForm
  };
}