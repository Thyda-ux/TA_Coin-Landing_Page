import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  X,
  Paperclip,
  Send,
  User,
  Info,
  MessageSquare,
  ArrowLeft,
  Headphones,
  ClipboardList,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { askSupportBot } from '../lib/vectorService';
import { useAgentConnection } from '../hooks/useAgentConnection';
import { validateSupportForm, buildSupportSummary, createSupportTicket } from '../lib/supportIntake';
import { getFileExtension } from '../lib/realtimeChat';
import styles from './styles/ChatBot.module.css';

// ─── Constants ────────────────────────────────────────────────────
const CHAT_INACTIVITY_TIMEOUT_MINUTES = 20;
const CHAT_TIMEOUT_WARNING_MINUTES = 5;

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    text: 'Hi there. How can we help you today?',
    options: ['FAQs', 'Connect to Agent'],
  },
];

const CATEGORY_OPTIONS = [
  'Getting Started',
  'Account & App',
  'Payments & Wallet',
  'Security',
  'Support',
  'Careers',
  'Legal',
];

const ISSUE_TYPE_OPTIONS = [
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

const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg';

const getInitialSupportForm = () => ({
  active: false,
  name: '',
  email: '',
  phone: '',
  issueType: ISSUE_TYPE_OPTIONS[0],
  issueDetails: '',
});

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────
const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [supportForm, setSupportForm] = useState(getInitialSupportForm);
  const [supportFormError, setSupportFormError] = useState('');
  const [supportFormInlineFaq, setSupportFormInlineFaq] = useState(false);
  const [mode, setMode] = useState('bot'); // 'bot' | 'agent'

  const [pendingImage, setPendingImage] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const messagesEndRef = useRef(null);
  const supportFormRef = useRef(null);
  const fileInputRef = useRef(null);

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
  
  const [remainingInactivityMs, setRemainingInactivityMs] = useState(null);

  const currentTime = useMemo(
    () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [messages.length],
  );

  const canAttach = mode === 'agent' && agentJoined;

  const clearPendingImage = useCallback(() => {
    if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
    setAttachError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [pendingImage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentMessages, mode, sessionTimedOut]);

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
            options: ['FAQs', 'Connect to Agent'],
          },
        ]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [sessionTimedOut, mode, disconnectAgent, clearPendingImage]);

  useEffect(() => {
    if (!inactivityDeadline || mode !== 'agent' || sessionTimedOut) {
      setRemainingInactivityMs(null);
      return;
    }
    const updateRemaining = () => {
      setRemainingInactivityMs(Math.max(0, inactivityDeadline - Date.now()));
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [inactivityDeadline, mode, sessionTimedOut]);

  useEffect(() => {
    return () => {
      if (pendingImage?.preview) URL.revokeObjectURL(pendingImage.preview);
    };
  }, [pendingImage]);

  const toggleChat = () => setIsOpen((current) => !current);

  // ─── FAQ Handlers ─────────────────────────────────────────────
  const showFaqCategories = () => {
    setMessages((current) => [
      ...current,
      {
        role: 'bot',
        text: 'Choose a category or type your question.',
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
          faqLinks: data || [],
        },
      ]);
    } catch (err) {
      setMessages((current) => [...current, { role: 'bot', text: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Agent Connection ─────────────────────────────────────────
  const connectToAgent = async (description) => {
    try {
      setIsLoading(true);
      await startAgentSession(description);
      setMode('agent');
      setMessages((current) => [...current, { role: 'bot', text: '🔄 Connecting you to a live agent. Please wait...' }]);
    } catch (err) {
      setMessages((current) => [...current, { role: 'bot', text: `Failed to connect: ${err.message}.` }]);
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
        options: ['FAQs', 'Connect to Agent'],
      },
    ]);
  };

  // ─── Image Handlers ───────────────────────────────────────────
  const handleAttachClick = () => {
    if (!canAttach) return;
    setAttachError('');
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAttachError('Image must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }
    setAttachError('');
    setPendingImage({ file, preview: URL.createObjectURL(file) });
  };

  const sendPendingImage = async () => {
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

  // ─── Form Handlers ────────────────────────────────────────────
  const resetSupportForm = () => {
    setSupportForm(getInitialSupportForm());
    setSupportFormError('');
    setSupportFormInlineFaq(false);
  };

  const focusSupportForm = () => {
    requestAnimationFrame(() => {
      supportFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const submitSupportForm = async (event) => {
    event.preventDefault();
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
      { role: 'user', text: `Submitted Ticket for: ${normalized.issueType}` },
    ]);

    setIsLoading(true);
    try {
      await connectToAgent(summary);
      resetSupportForm();
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'bot', text: `Support request failed: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOption = async (option) => {
    setMessages((current) => [...current, { role: 'user', text: option }]);

    if (option === 'FAQs') {
      if (supportForm.active) {
        setSupportFormInlineFaq(true);
        focusSupportForm();
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
      setMessages((prev) => [...prev, { role: 'bot', text: 'Please complete this support form so we can connect you to the right agent.' }]);
      focusSupportForm();
    }
  };

  // ─── AI Submit Handler ────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanMessage = input.trim();

    // 1. Agent Mode Handling
    if (mode === 'agent') {
      if (pendingImage?.file) await sendPendingImage();
      if (cleanMessage) {
        setInput('');
        try { await sendAgentMessage(cleanMessage); } catch (err) { console.error('Failed to send:', err); }
      }
      return;
    }

    // 2. Bot Mode Handling (Agentic Edge Function)
    if (!cleanMessage || isLoading) return;
    setInput('');

    // Append user message immediately
    const updatedMessages = [...messages, { role: 'user', text: cleanMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Extract the last 6 messages to send as conversational context
      const chatHistory = updatedMessages.slice(-6).map(m => ({ role: m.role, text: m.text }));
      
      const data = await askSupportBot(cleanMessage, chatHistory);

      if (data.action === "TRIGGER_ACCOUNT_UI") {
        setMessages((current) => [
          ...current,
          { role: 'bot', text: data.text, options: ['Go to Account Settings'] },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          { role: 'bot', text: data.text },
        ]);
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: "I'm having trouble searching our knowledge base right now. Would you like to connect to an agent?",
          options: ['Connect to Agent'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render Helpers ───────────────────────────────────────────
  const renderLightbox = () => {
    if (!lightboxUrl) return null;
    return (
      <div className={styles.imageLightbox} onClick={() => setLightboxUrl(null)}>
        <img src={lightboxUrl} alt="Full size attachment" />
      </div>
    );
  };

  const renderAttachment = (attachmentUrl) => {
    if (!attachmentUrl) return null;
    return (
      <img
        src={attachmentUrl}
        alt="Attachment"
        className={styles.attachmentImage}
        onClick={(e) => { e.stopPropagation(); setLightboxUrl(attachmentUrl); }}
      />
    );
  };

  const renderImagePreview = () => {
    if (!pendingImage) return null;
    return (
      <div className={styles.imagePreviewBar}>
        <img src={pendingImage.preview} alt="Preview" className={styles.imagePreviewThumb} />
        <div className={styles.imagePreviewInfo}>
          <span className={styles.imagePreviewName}>{pendingImage.file.name}</span>
          <span className={styles.imagePreviewSize}>{formatFileSize(pendingImage.file.size)}</span>
        </div>
        {isUploading ? (
          <div className={styles.uploadingIndicator}>
            <div className={styles.uploadingSpinner} /><span>Uploading...</span>
          </div>
        ) : (
          <button className={styles.imagePreviewRemove} onClick={clearPendingImage} type="button">
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────
  const timeoutWarningThresholdMs = Math.max(0, (CHAT_TIMEOUT_WARNING_MINUTES || 0) * 60 * 1000);
  const showTimeoutWarning = mode === 'agent' && agentJoined && !sessionTimedOut && remainingInactivityMs > 0 && remainingInactivityMs <= timeoutWarningThresholdMs;
  const remainingWarningSeconds = remainingInactivityMs ? Math.ceil(remainingInactivityMs / 1000) : 0;

  return (
    <div className={styles.chatbotContainer}>
      {renderLightbox()}

      {!isOpen && (
        <button className={styles.chatbotFab} onClick={toggleChat}>
          <MessageSquare size={24} />
          <span>Need Help?</span>
        </button>
      )}

      {isOpen && (
        <div className={styles.chatbotWindow}>
          
          {/* Header */}
          <div className={`${styles.chatbotHeader} ${mode === 'agent' ? styles.agentHeader : ''}`}>
            {mode === 'agent' && (
              <button className={styles.chatBackBtn} onClick={backToBot} title="Back to bot"><ArrowLeft size={18} /></button>
            )}
            <div className={styles.agentHeaderInfo}>
              {mode === 'agent' ? <Headphones size={18} /> : null}
              <h3>{mode === 'agent' ? 'Live Agent' : 'T.A Coin Support'}</h3>
            </div>
            {mode === 'agent' && (
              <div className={styles.agentStatus}>
                {agentWaiting && !sessionTimedOut && <span className={styles.statusWaiting}>Waiting...</span>}
                {agentJoined && !sessionTimedOut && <span className={styles.statusConnected}>Connected</span>}
                {sessionTimedOut && <span className={styles.statusWaiting}>Timed Out</span>}
              </div>
            )}
            <button onClick={toggleChat}><X size={18} /></button>
          </div>

          {/* Messages Area */}
          <div className={styles.chatbotMessages}>
            <div className={styles.chatTimestamp}>{currentTime}</div>

            {/* Agent Mode specific system messages */}
            {mode === 'agent' && agentWaiting && !agentJoined && (
              <div className={`${styles.chatMessageGroup} ${styles.bot}`}>
                <div className={styles.chatAvatar}><Headphones size={18} /></div>
                <div className={styles.chatMessageContent}>
                  <span className={styles.chatSenderName}>System</span>
                  <div className={styles.chatBubble}>
                    <div className={styles.typingDots}><span></span><span></span><span></span></div>
                    <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>Waiting for an agent...</p>
                  </div>
                </div>
              </div>
            )}

            {mode === 'agent' && agentJoined && (
              <div className={`${styles.chatMessageGroup} ${styles.bot}`}>
                <div className={styles.chatAvatar}><Headphones size={18} /></div>
                <div className={styles.chatMessageContent}>
                  <span className={styles.chatSenderName}>System</span>
                  <div className={styles.chatBubble}>✅ An agent has joined the chat.</div>
                </div>
              </div>
            )}

            {/* Message Mapper */}
            {(mode === 'agent' ? agentMessages : messages).map((item, index) => {
              const isUser = mode === 'agent' ? item.sender_role === 'user' : item.role === 'user';
              const isAgent = item.sender_role === 'agent';
              
              return (
                <div key={item.id || index} className={`${styles.chatMessageGroup} ${isUser ? styles.user : styles.bot}`}>
                  <div className={styles.chatAvatar}>
                    {isUser ? <User size={18} /> : isAgent ? <Headphones size={18} /> : <Info size={18} />}
                  </div>
                  <div className={styles.chatMessageContent}>
                    {!isUser && (
                      <span className={styles.chatSenderName}>
                        {mode === 'agent' ? (isAgent ? 'Agent' : 'System') : 'T.A Coin Assistant'}
                      </span>
                    )}
                    <div className={styles.chatBubble}>
                      {item.attachment_url ? (
                        <>{item.content !== '[Image]' && item.content}{renderAttachment(item.attachment_url)}</>
                      ) : (
                        item.text || item.content
                      )}
                      
                      {/* Interactive Bot Options */}
                      {item.options && (
                        <div className={styles.chatOptions}>
                          {item.options.map(opt => (
                            <button key={opt} type="button" className={styles.chatOptionBtn} onClick={() => handleOption(opt)} disabled={isLoading}>{opt}</button>
                          ))}
                        </div>
                      )}
                      {item.faqLinks && (
                        <div className={styles.chatOptions}>
                          {item.faqLinks.map(faq => (
                            <button key={faq.question} type="button" className={styles.chatOptionBtn} onClick={() => {
                              setMessages(cur => [...cur, { role: 'user', text: faq.question }, { role: 'bot', text: faq.answer }]);
                            }}>
                              {faq.question} <ExternalLink size={14} />
                            </button>
                          ))}
                        </div>
                      )}
                      <span className={styles.chatBubbleTime}>{currentTime}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading State */}
            {isLoading && mode === 'bot' && (
              <div className={`${styles.chatMessageGroup} ${styles.bot}`}>
                <div className={styles.chatAvatar}><Info size={18} /></div>
                <div className={styles.chatMessageContent}>
                  <div className={styles.chatBubble}>
                    <div className={styles.typingDots}><span></span><span></span><span></span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Support Form UI */}
            {supportForm.active && mode === 'bot' && (
              <form ref={supportFormRef} className={styles.supportFormCard} onSubmit={submitSupportForm}>
                <div className={styles.supportFormHeader}>
                  <div className={styles.supportFormHeaderIcon}><User size={18} /></div>
                  <div><h4>Customer Details</h4><p>Contact information.</p></div>
                  <button type="button" className={styles.supportFormCloseBtn} onClick={resetSupportForm}><X size={14} /></button>
                </div>
                <div className={styles.supportFormGrid}>
                  <label className={styles.supportField}><span>Name *</span><input type="text" value={supportForm.name} onChange={e => setSupportForm(p => ({ ...p, name: e.target.value }))} required /></label>
                  <label className={styles.supportField}><span>Phone *</span><input type="tel" value={supportForm.phone} onChange={e => setSupportForm(p => ({ ...p, phone: e.target.value }))} required /></label>
                  <label className={`${styles.supportField} ${styles.supportFieldFull}`}><span>Email *</span><input type="email" value={supportForm.email} onChange={e => setSupportForm(p => ({ ...p, email: e.target.value }))} required /></label>
                </div>
                <div className={styles.supportFormHeader}>
                  <div className={styles.supportFormHeaderIcon}><ClipboardList size={18} /></div>
                  <div><h4>Issue Details</h4><p>Describe the issue.</p></div>
                </div>
                <div className={styles.supportIssueGrid}>
                  <label className={styles.supportField}><span>Type *</span>
                    <select value={supportForm.issueType} onChange={e => setSupportForm(p => ({ ...p, issueType: e.target.value }))}>
                      {ISSUE_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>
                  <label className={`${styles.supportField} ${styles.supportFieldFull}`}><span>Details</span>
                    <textarea rows={2} value={supportForm.issueDetails} onChange={e => setSupportForm(p => ({ ...p, issueDetails: e.target.value }))} />
                  </label>
                </div>
                {supportFormError && <p className={styles.supportFormError}>{supportFormError}</p>}
                <div className={styles.supportFormActions}>
                  <button type="button" className={styles.supportCancelBtn} onClick={resetSupportForm} disabled={isLoading}>Cancel</button>
                  <button type="submit" className={styles.supportSubmitBtn} disabled={isLoading}>{isLoading ? 'Submitting...' : 'Connect to Agent'}</button>
                </div>
              </form>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          {mode === 'agent' && renderImagePreview()}
          {attachError && <div className={styles.attachmentError}>{attachError}</div>}
          {showTimeoutWarning && <div className={styles.sessionWarning}>Session ending in {Math.floor(remainingWarningSeconds / 60)}:{String(remainingWarningSeconds % 60).padStart(2, '0')} due to inactivity.</div>}

          <form className={styles.chatbotFooter} onSubmit={handleSubmit}>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className={styles.hiddenFileInput} onChange={handleFileSelect} />
            <button className={`${styles.chatAttachBtn} ${canAttach && pendingImage ? styles.chatAttachBtnActive : ''}`} type="button" onClick={handleAttachClick} disabled={!canAttach || isUploading}>
              {canAttach ? <ImageIcon size={20} /> : <Paperclip size={20} />}
            </button>
            <div className={styles.chatInputWrapper}>
              <input
                type="text"
                className={styles.chatInput}
                placeholder={mode === 'agent' ? (sessionTimedOut ? 'Session timed out' : agentJoined ? 'Type message...' : 'Waiting for agent...') : supportForm.active ? 'Complete the form above' : 'Type your message'}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={(mode === 'agent' && (!agentJoined || sessionTimedOut)) || supportForm.active}
              />
            </div>
            <div className={styles.chatSendWrapper}>
              <button className={styles.chatSendBtn} type="submit" disabled={(mode === 'agent' ? !(agentJoined && !sessionTimedOut && (input.trim() || pendingImage)) : !(input.trim() && !isLoading && !supportForm.active)) || isUploading}>
                <Send size={18} />
              </button>
            </div>
          </form>

        </div>
      )}
    </div>
  );
};

export default ChatBot;