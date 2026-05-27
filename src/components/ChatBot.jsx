import React, { useState, useRef, useEffect } from 'react';
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
import {
  useChatSession,
  ISSUE_TYPE_OPTIONS,
  ACCEPTED_IMAGE_TYPES,
  formatFileSize
} from '../hooks/useChatSession';
import styles from './styles/ChatBot.module.css';

// ─── Component ────────────────────────────────────────────────────
const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const supportFormRef = useRef(null);
  const fileInputRef = useRef(null);
  const focusFrameRef = useRef();

  const toggleChat = () => setIsOpen((current) => !current);

  const focusSupportForm = () => {
    cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = requestAnimationFrame(() => {
      supportFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const {
    input, setInput,
    isLoading,
    messages,
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
    showTimeoutWarning,
    handleSubmit,
    handleOption,
    submitSupportForm,
    backToBot,
    handleFileSelect,
    clearPendingImage,
    resetSupportForm
  } = useChatSession(isOpen);

  const formatMessageTime = (item) => {
    const date = item.timestamp || item.created_at ? new Date(item.timestamp || item.created_at) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canAttach = mode === 'agent' && agentJoined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentMessages, mode, sessionTimedOut]);

  useEffect(() => {
    return () => {
      if (focusFrameRef.current) cancelAnimationFrame(focusFrameRef.current);
    };
  }, []);

  const handleAttachClick = () => {
    if (!canAttach) return;
    setAttachError('');
    fileInputRef.current?.click();
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = handleFileSelect(file);
      if (!success) e.target.value = '';
    }
  };

  const handleClearImage = () => {
    clearPendingImage();
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          <button className={styles.imagePreviewRemove} onClick={handleClearImage} type="button">
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────
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
            <div className={styles.chatTimestamp}>{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>

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
                            <button key={opt} type="button" className={styles.chatOptionBtn} onClick={() => handleOption(opt, focusSupportForm)} disabled={isLoading}>{opt}</button>
                          ))}
                        </div>
                      )}
                      {item.faqLinks && (
                        <div className={styles.chatOptions}>
                          {item.faqLinks.map(faq => (
                            <button key={faq.question} type="button" className={styles.chatOptionBtn} onClick={() => {
                              setMessages(cur => [
                                ...cur, 
                                { role: 'user', text: faq.question, timestamp: new Date().toISOString() }, 
                                { role: 'bot', text: faq.answer, timestamp: new Date().toISOString() }
                              ]);
                            }}>
                              {faq.question} <ExternalLink size={14} />
                            </button>
                          ))}
                        </div>
                      )}
                      <span className={styles.chatBubbleTime}>{formatMessageTime(item)}</span>
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
              <form ref={supportFormRef} className={styles.supportFormCard} onSubmit={(e) => submitSupportForm(e)}>
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

          <form className={styles.chatbotFooter} onSubmit={(e) => handleSubmit(e)}>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className={styles.hiddenFileInput} onChange={onFileChange} />
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