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
import { semanticSearchFaqs, generateAiResponse, keywordSearchFaqs } from '../lib/vectorService';
import { useAgentConnection } from '../hooks/useAgentConnection';
import { validateSupportForm, buildSupportSummary, createSupportTicket } from '../lib/supportIntake';
import { getFileExtension } from '../lib/realtimeChat';
import styles from './styles/ChatBot.module.css';

// ─── Constants ────────────────────────────────────────────────────

/**
 * Chat session inactivity timeout in minutes.
 * If the user does not send a message within this duration,
 * the agent chat session will be automatically closed.
 * The session and messages are preserved in the agent's chat history.
 *
 * Set to 0 or null to disable the timeout.
 * Adjust this value as needed.
 */
const CHAT_INACTIVITY_TIMEOUT_MINUTES = 20;
/**
 * Warning lead time in minutes before inactivity timeout.
 * Set to 0 or null to disable pre-timeout warning.
 */
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
const HIGH_CONFIDENCE = 0.65;
const LOW_CONFIDENCE = 0.45;

const getInitialSupportForm = () => ({
  active: false,
  name: '',
  email: '',
  phone: '',
  issueType: ISSUE_TYPE_OPTIONS[0],
  issueDetails: '',
});

// ─── Helper: format file size ─────────────────────────────────────

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

  // Image attachment state (agent mode only)
  const [pendingImage, setPendingImage] = useState(null); // { file, preview }
  const [isUploading, setIsUploading] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const messagesEndRef = useRef(null);
  const supportFormRef = useRef(null);
  const fileInputRef = useRef(null);

  // Supabase Realtime agent connection (with configurable inactivity timeout)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages.length],
  );

  // Determine if attachment button should be enabled
  const canAttach = mode === 'agent' && agentJoined;

  const clearPendingImage = useCallback(() => {
    if (pendingImage?.preview) {
      URL.revokeObjectURL(pendingImage.preview);
    }
    setPendingImage(null);
    setAttachError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [pendingImage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentMessages, mode, sessionTimedOut]);

  // Handle session timeout — show message and switch back to bot mode
  useEffect(() => {
    if (sessionTimedOut && mode === 'agent') {
      // Small delay so the system timeout message appears in the chat first
      const timer = setTimeout(() => {
        disconnectAgent();
        clearPendingImage();
        setMode('bot');
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: `⏱️ Your agent chat session was closed due to ${CHAT_INACTIVITY_TIMEOUT_MINUTES} minutes of inactivity. The conversation has been saved. How else can I help you?`,
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
      const remaining = Math.max(0, inactivityDeadline - Date.now());
      setRemainingInactivityMs(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [inactivityDeadline, mode, sessionTimedOut]);

  // Clean up image preview URL on unmount or when cleared
  useEffect(() => {
    return () => {
      if (pendingImage?.preview) {
        URL.revokeObjectURL(pendingImage.preview);
      }
    };
  }, [pendingImage]);

  const toggleChat = () => setIsOpen((current) => !current);

  // ─── FAQ Handlers ─────────────────────────────────────────────

  const showFaqCategories = () => {
    setMessages((current) => [
      ...current,
      {
        role: 'bot',
        text: 'Choose a category or type your question. I can handle small typos too.',
        options: CATEGORY_OPTIONS,
      },
    ]);
  };

  const showCategoryFaqs = async (category) => {
    if (!supabase) {
      setMessages((current) => [
        ...current,
        { role: 'bot', text: 'FAQ categories are not connected yet. Please configure Supabase first.' },
      ]);
      return;
    }

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
          text: data?.length
            ? `Here are common ${category} questions:`
            : `No published FAQs were found for ${category}.`,
          faqLinks: data || [],
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: 'bot', text: `Could not load ${category} FAQs: ${err.message}` },
      ]);
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
      setMessages((current) => [
        ...current,
        { role: 'bot', text: '🔄 Connecting you to a live agent. Please wait...' },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { role: 'bot', text: `Failed to connect to agent: ${err.message}. Please try again later.` },
      ]);
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

  // ─── Image Attachment Handlers ────────────────────────────────

  const handleAttachClick = () => {
    if (!canAttach) return;
    setAttachError('');
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const validExtensions = ['png', 'jpg', 'jpeg'];
    const fileExt = getFileExtension(file.name);
    const validByMime = validTypes.includes((file.type || '').toLowerCase());
    const validByExt = validExtensions.includes(fileExt);
    if (!validByMime && !validByExt) {
      setAttachError('Only PNG and JPEG images are allowed.');
      e.target.value = '';
      return;
    }

    // Validate file size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      setAttachError('Image must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }

    setAttachError('');
    const preview = URL.createObjectURL(file);
    setPendingImage({ file, preview });
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

  // ─── Form & Option Handlers ───────────────────────────────────

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
      const firstError = Object.values(errors)[0] || 'Please complete all required fields.';
      setSupportFormError(firstError);
      return;
    }

    let ticketInfo = null;
    try {
      ticketInfo = await createSupportTicket(supabase, normalized, {
        source: 'chatbot',
        chatUserId,
        metadata: { channel: 'live_chat_widget' },
      });
    } catch (ticketErr) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `Note: We could not save your ticket record in the database (${ticketErr.message}), but we will still connect you to a live agent.`,
        },
      ]);
    }

    const summary = ticketInfo
      ? `${buildSupportSummary(normalized)}\nTicket No: ${ticketInfo.ticket_no || ticketInfo.id}`
      : buildSupportSummary(normalized);

    setMessages((current) => [
      ...current,
      {
        role: 'user',
        text: ticketInfo
          ? `Ticket: ${ticketInfo.ticket_no || ticketInfo.id}\nName: ${normalized.name}\nEmail: ${normalized.email}\nPhone: ${normalized.phone}\nIssue Type: ${normalized.issueType}\nIssue: ${normalized.issueDetails}`
          : `Name: ${normalized.name}\nEmail: ${normalized.email}\nPhone: ${normalized.phone}\nIssue Type: ${normalized.issueType}\nIssue: ${normalized.issueDetails}`,
      },
    ]);

    setIsLoading(true);
    try {
      await connectToAgent(summary);
      resetSupportForm();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: `Support request failed: ${err.message}` },
      ]);
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
      if (supportForm.active) {
        setSupportFormInlineFaq(false);
        focusSupportForm();
        return;
      }
      setSupportForm({ ...getInitialSupportForm(), active: true });
      setSupportFormError('');
      setSupportFormInlineFaq(false);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Please complete this support form so we can connect you to the right agent faster.' },
      ]);
      focusSupportForm();
    }
  };

  // ─── Submit Handler ───────────────────────────────────────────

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanMessage = input.trim();

    // Agent mode: handle image-only send or text+image
    if (mode === 'agent') {
      // Send pending image if exists
      if (pendingImage?.file) {
        await sendPendingImage();
      }

      // Send text message if exists
      if (cleanMessage) {
        setInput('');
        try {
          await sendAgentMessage(cleanMessage);
        } catch (err) {
          console.error('Failed to send agent message:', err);
        }
      }
      return;
    }

    // Bot mode requires text
    if (!cleanMessage || isLoading) return;
    setInput('');

    setMessages((current) => [...current, { role: 'user', text: cleanMessage }]);

    setIsLoading(true);

    try {
      const results = await semanticSearchFaqs(cleanMessage);

      if (results && results.length > 0) {
        const topMatch = results[0];

        if (topMatch.score >= HIGH_CONFIDENCE) {
          const relatedResults = results.slice(1).filter((r) => r.score >= LOW_CONFIDENCE);

          let responseText;
          try {
            responseText = await generateAiResponse(cleanMessage, results.slice(0, 3));
          } catch {
            responseText = topMatch.answer;
          }

          setMessages((current) => [
            ...current,
            {
              role: 'bot',
              text: responseText,
              source: topMatch.question,
              category: topMatch.category,
              score: topMatch.score,
              related: relatedResults,
            },
          ]);
        } else {
          const suggestions = results.filter((r) => r.score >= LOW_CONFIDENCE).slice(0, 4);

          if (suggestions.length > 0) {
            setMessages((current) => [
              ...current,
              {
                role: 'bot',
                text: "I'm not sure I understood your question. Did you mean one of these?",
                faqLinks: suggestions.map((s) => ({
                  question: s.question,
                  answer: s.answer,
                  category: s.category,
                })),
              },
            ]);
          } else {
            setMessages((current) => [
              ...current,
              {
                role: 'bot',
                text: "I couldn't find a matching answer. You can try rephrasing your question, browse our FAQs, or connect to a live agent.",
                options: ['FAQs', 'Connect to Agent'],
              },
            ]);
          }
        }
      } else {
        setMessages((current) => [
          ...current,
          {
            role: 'bot',
            text: "I couldn't find a matching answer. You can try rephrasing your question, browse our FAQs, or connect to a live agent.",
            options: ['FAQs', 'Connect to Agent'],
          },
        ]);
      }
    } catch {
      // Fallback: keyword search
      try {
        const fallbackResults = await keywordSearchFaqs(cleanMessage);
        if (fallbackResults && fallbackResults.length > 0) {
          const topFallback = fallbackResults[0];

          if (topFallback.score >= HIGH_CONFIDENCE) {
            setMessages((current) => [
              ...current,
              {
                role: 'bot',
                text: topFallback.answer,
                source: topFallback.question,
                category: topFallback.category,
                score: topFallback.score,
              },
            ]);
          } else {
            setMessages((current) => [
              ...current,
              {
                role: 'bot',
                text: "I found some topics that might help. Did you mean one of these?",
                faqLinks: fallbackResults.slice(0, 4).map((r) => ({
                  question: r.question,
                  answer: r.answer,
                  category: r.category,
                })),
              },
            ]);
          }
        } else {
          setMessages((current) => [
            ...current,
            {
              role: 'bot',
              text: "I couldn't find a matching answer. You can try rephrasing your question, browse our FAQs, or connect to a live agent.",
              options: ['FAQs', 'Connect to Agent'],
            },
          ]);
        }
      } catch {
        setMessages((current) => [
          ...current,
          {
            role: 'bot',
            text: "I'm having trouble searching our knowledge base right now. Would you like to connect to an agent?",
            options: ['Connect to Agent'],
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render: Image Lightbox ───────────────────────────────────

  const renderLightbox = () => {
    if (!lightboxUrl) return null;
    return (
      <div className={styles.imageLightbox} onClick={() => setLightboxUrl(null)}>
        <img src={lightboxUrl} alt="Full size attachment" />
      </div>
    );
  };

  // ─── Render: Attachment in Message Bubble ─────────────────────

  const renderAttachment = (attachmentUrl) => {
    if (!attachmentUrl) return null;
    return (
      <img
        src={attachmentUrl}
        alt="Attachment"
        className={styles.attachmentImage}
        onClick={(e) => {
          e.stopPropagation();
          setLightboxUrl(attachmentUrl);
        }}
      />
    );
  };

  // ─── Render: Image Preview Bar ────────────────────────────────

  const renderImagePreview = () => {
    if (!pendingImage) return null;
    return (
      <div className={styles.imagePreviewBar}>
        <img
          src={pendingImage.preview}
          alt="Preview"
          className={styles.imagePreviewThumb}
        />
        <div className={styles.imagePreviewInfo}>
          <span className={styles.imagePreviewName}>{pendingImage.file.name}</span>
          <span className={styles.imagePreviewSize}>
            {formatFileSize(pendingImage.file.size)}
          </span>
        </div>
        {isUploading ? (
          <div className={styles.uploadingIndicator}>
            <div className={styles.uploadingSpinner} />
            <span>Uploading...</span>
          </div>
        ) : (
          <button
            className={styles.imagePreviewRemove}
            onClick={clearPendingImage}
            type="button"
            aria-label="Remove image"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  // ─── Render: Agent Chat Mode ──────────────────────────────────

  const renderAgentChat = () => (
    <>
      <div className={`${styles.chatbotHeader} ${styles.agentHeader}`}>
        <button className={styles.chatBackBtn} onClick={backToBot} title="Back to bot">
          <ArrowLeft size={18} />
        </button>
        <div className={styles.agentHeaderInfo}>
          <Headphones size={18} />
          <h3>Live Agent</h3>
        </div>
        <div className={styles.agentStatus}>
          {agentWaiting && !sessionTimedOut && <span className={styles.statusWaiting}>Waiting...</span>}
            {agentJoined && !sessionTimedOut && <span className={styles.statusConnected}>Connected</span>}
            {sessionTimedOut && <span className={styles.statusWaiting}>Timed Out</span>}
        </div>
        <button onClick={toggleChat}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.chatbotMessages}>
        <div className={styles.chatTimestamp}>{currentTime}</div>

        {agentWaiting && !agentJoined && (
          <div className={`${styles.chatMessageGroup} ${styles.bot}`}>
            <div className={styles.chatAvatar}>
              <Headphones size={18} />
            </div>
            <div className={styles.chatMessageContent}>
              <span className={styles.chatSenderName}>System</span>
              <div className={styles.chatBubble}>
                <div className={styles.typingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
                  Waiting for an agent to join...
                </p>
              </div>
            </div>
          </div>
        )}

        {agentJoined && (
          <div className={`${styles.chatMessageGroup} ${styles.bot}`}>
            <div className={styles.chatAvatar}>
              <Headphones size={18} />
            </div>
            <div className={styles.chatMessageContent}>
              <span className={styles.chatSenderName}>System</span>
              <div className={styles.chatBubble}>
                ✅ An agent has joined the chat. You can now communicate in real time.
              </div>
            </div>
          </div>
        )}

        {agentMessages.map((msg) => {
          const isUser = msg.sender_role === 'user';
          const isAgent = msg.sender_role === 'agent';

          return (
            <div
              key={msg.id}
              className={`${styles.chatMessageGroup} ${isUser ? styles.user : styles.bot}`}
            >
              <div className={styles.chatAvatar}>
                {isUser ? (
                  <User size={18} />
                ) : isAgent ? (
                  <Headphones size={18} />
                ) : (
                  <Info size={18} />
                )}
              </div>
              <div className={styles.chatMessageContent}>
                {!isUser && (
                  <span className={styles.chatSenderName}>
                    {isAgent ? 'Agent' : 'System'}
                  </span>
                )}
                <div className={styles.chatBubble}>
                  {msg.attachment_url ? (
                    <>
                      {msg.content !== '[Image]' && msg.content}
                      {renderAttachment(msg.attachment_url)}
                    </>
                  ) : (
                    msg.content
                  )}
                  <span className={styles.chatBubbleTime}>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>
    </>
  );

  // ─── Render: Bot Chat Mode ────────────────────────────────────

  const renderBotChat = () => (
    <>
      <div className={styles.chatbotHeader}>
        <h3>T.A Coin Support</h3>
        <button onClick={toggleChat}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.chatbotMessages}>
        <div className={styles.chatTimestamp}>{currentTime}</div>

        {messages.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={`${styles.chatMessageGroup} ${item.role === 'bot' ? styles.bot : styles.user}`}
          >
            <div className={styles.chatAvatar}>
              {item.role === 'bot' ? <Info size={18} /> : <User size={18} />}
            </div>
            <div className={styles.chatMessageContent}>
              {item.role === 'bot' && (
                <span className={styles.chatSenderName}>T.A Coin Assistant</span>
              )}
              <div className={styles.chatBubble}>
                {item.text}
                {item.category && <div className={styles.chatCategory}>{item.category}</div>}
                {item.related && item.related.length > 0 && (
                  <div className={styles.chatRelatedSuggestions}>
                    <p>Related topics:</p>
                    {item.related.map((rel, rIdx) => (
                      <button
                        key={rIdx}
                        className={styles.chatOptionBtn}
                        onClick={() =>
                          setMessages((prev) => [
                            ...prev,
                            {
                              role: 'bot',
                              text: rel.answer,
                              source: rel.question,
                            },
                          ])
                        }
                      >
                        {rel.question} <ExternalLink size={12} />
                      </button>
                    ))}
                  </div>
                )}
                {item.options && (
                  <div className={styles.chatOptions}>
                    {item.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={styles.chatOptionBtn}
                        onClick={() => handleOption(option)}
                        disabled={isLoading}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {item.faqLinks && (
                  <div className={styles.chatOptions}>
                    {item.faqLinks.map((faq) => (
                      <button
                        key={faq.question}
                        type="button"
                        className={styles.chatOptionBtn}
                        onClick={() =>
                          setMessages((current) => [
                            ...current,
                            { role: 'user', text: faq.question },
                            {
                              role: 'bot',
                              text: faq.answer,
                              source: faq.question,
                              category: faq.category,
                            },
                          ])
                        }
                      >
                        {faq.question} <ExternalLink size={14} />
                      </button>
                    ))}
                  </div>
                )}
                <span className={styles.chatBubbleTime}>{currentTime}</span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className={`${styles.chatMessageGroup} ${styles.bot}`}>
            <div className={styles.chatAvatar}>
              <Info size={18} />
            </div>
            <div className={styles.chatMessageContent}>
              <span className={styles.chatSenderName}>T.A Coin Assistant</span>
              <div className={styles.chatBubble}>
                <div className={styles.typingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {supportForm.active && (
          <form ref={supportFormRef} className={styles.supportFormCard} onSubmit={submitSupportForm}>
            <div className={styles.supportFormHeader}>
              <div className={styles.supportFormHeaderIcon}>
                <User size={18} />
              </div>
              <div>
                <h4>Customer Details</h4>
                <p>Basic customer identity and contact information.</p>
              </div>
              <button
                type="button"
                className={styles.supportFormCloseBtn}
                onClick={resetSupportForm}
                disabled={isLoading}
                aria-label="Close support form"
              >
                <X size={14} />
              </button>
            </div>

            <div className={styles.supportFormGrid}>
              <label className={styles.supportField} htmlFor="support-name">
                <span>Customer Name *</span>
                <input
                  id="support-name"
                  name="customerName"
                  type="text"
                  value={supportForm.name}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  autoComplete="name"
                  pattern="[A-Za-z\s]{2,80}"
                  title="Name should contain letters only (no numbers or symbols)."
                  required
                />
              </label>
              <label className={styles.supportField} htmlFor="support-phone">
                <span>Phone Number *</span>
                <input
                  id="support-phone"
                  name="phoneNumber"
                  type="tel"
                  value={supportForm.phone}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  autoComplete="tel"
                  inputMode="numeric"
                  pattern="[0-9]{7,30}"
                  title="Phone number should contain digits only."
                  required
                />
              </label>
              <label className={`${styles.supportField} ${styles.supportFieldFull}`} htmlFor="support-email">
                <span>Email *</span>
                <input
                  id="support-email"
                  name="email"
                  type="email"
                  value={supportForm.email}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="customer@email.com"
                  autoComplete="email"
                  required
                />
              </label>
            </div>

            <div className={styles.supportFormHeader}>
              <div className={styles.supportFormHeaderIcon}>
                <ClipboardList size={18} />
              </div>
              <div>
                <h4>Issue Details</h4>
                <p>Classify and describe the customer issue clearly.</p>
              </div>
            </div>

            <div className={styles.supportIssueGrid}>
              <label className={styles.supportField} htmlFor="support-issue-type">
                <span>Issue Type *</span>
                <select
                  id="support-issue-type"
                  name="issueType"
                  value={supportForm.issueType}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, issueType: e.target.value }))}
                  autoComplete="off"
                  required
                >
                  {ISSUE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${styles.supportField} ${styles.supportFieldFull}`} htmlFor="support-issue-details">
                <span>Issue Details (Optional)</span>
                <textarea
                  id="support-issue-details"
                  name="issueDetails"
                  value={supportForm.issueDetails}
                  onChange={(e) => setSupportForm((prev) => ({ ...prev, issueDetails: e.target.value }))}
                  placeholder="Please describe your issue clearly."
                  autoComplete="off"
                  rows={4}
                />
              </label>
            </div>

            {supportFormError && (
              <p className={styles.supportFormError}>{supportFormError}</p>
            )}

            <div className={styles.supportFormActions}>
              <button
                type="button"
                className={styles.supportCancelBtn}
                onClick={resetSupportForm}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button type="submit" className={styles.supportSubmitBtn} disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Connect to Agent'}
              </button>
            </div>

            {supportFormInlineFaq && (
              <div className={styles.supportInlineFaq}>
                <p>Choose a category while keeping this form open:</p>
                <div className={styles.chatOptions}>
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={styles.chatOptionBtn}
                      onClick={() => handleOption(category)}
                      disabled={isLoading}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        <div ref={messagesEndRef} />
      </div>
    </>
  );

  // ─── Render: Footer (shared between modes) ───────────────────
  const timeoutWarningMinutes = Math.max(
    0,
    Math.min(
      CHAT_TIMEOUT_WARNING_MINUTES || 0,
      Math.max((CHAT_INACTIVITY_TIMEOUT_MINUTES || 0) - 0.1, 0),
    ),
  );
  const timeoutWarningThresholdMs = timeoutWarningMinutes * 60 * 1000;
  const showTimeoutWarning =
    mode === 'agent' &&
    agentJoined &&
    !sessionTimedOut &&
    timeoutWarningThresholdMs > 0 &&
    remainingInactivityMs !== null &&
    remainingInactivityMs > 0 &&
    remainingInactivityMs <= timeoutWarningThresholdMs;
  const remainingWarningSeconds = remainingInactivityMs ? Math.ceil(remainingInactivityMs / 1000) : 0;
  const warningMinutes = Math.floor(remainingWarningSeconds / 60);
  const warningSeconds = String(remainingWarningSeconds % 60).padStart(2, '0');

  const renderFooter = () => {
    const isAgentMode = mode === 'agent';
    const canSend = isAgentMode
      ? agentJoined && !sessionTimedOut && (input.trim() || pendingImage)
      : input.trim() && !isLoading && !supportForm.active;

    return (
      <>
        {/* Image preview bar (agent mode only) */}
        {isAgentMode && renderImagePreview()}

        {/* Attachment error message */}
        {attachError && (
          <div className={styles.attachmentError}>{attachError}</div>
        )}

        {showTimeoutWarning && (
          <div className={styles.sessionWarning}>
            Session will end in {warningMinutes}:{warningSeconds} due to inactivity. Send a message to keep it open.
          </div>
        )}

        <form className={styles.chatbotFooter} onSubmit={handleSubmit}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            id="chat-attachment-input"
            name="chatAttachment"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            className={styles.hiddenFileInput}
            onChange={handleFileSelect}
            tabIndex={-1}
          />

          {/* Attach button — only active in agent mode when connected */}
          <button
            className={`${styles.chatAttachBtn} ${canAttach && pendingImage ? styles.chatAttachBtnActive : ''}`}
            type="button"
            aria-label={canAttach ? 'Attach image (PNG or JPEG)' : 'Attachments available in agent chat only'}
            title={canAttach ? 'Attach image (PNG or JPEG)' : 'Attachments available in agent chat only'}
            onClick={handleAttachClick}
            disabled={!canAttach || isUploading}
          >
            {canAttach ? <ImageIcon size={20} /> : <Paperclip size={20} />}
          </button>

          <div className={styles.chatInputWrapper}>
            <input
              id="chat-message-input"
              name="chatMessage"
              type="text"
              className={styles.chatInput}
              placeholder={
                isAgentMode
                  ? sessionTimedOut
                    ? 'Session timed out'
                    : agentJoined
                      ? 'Type your message to agent...'
                      : 'Waiting for agent...'
                  : supportForm.active
                    ? 'Complete the support form above'
                    : 'Type your message'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              disabled={(isAgentMode && (!agentJoined || sessionTimedOut)) || supportForm.active}
            />
          </div>

          <div className={styles.chatSendWrapper}>
            <button
              className={styles.chatSendBtn}
              type="submit"
              disabled={!canSend || isUploading}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────

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
          {mode === 'agent' ? renderAgentChat() : renderBotChat()}
          {renderFooter()}
        </div>
      )}
    </div>
  );
};

export default ChatBot;
