import { useEffect, useState, useCallback, useRef } from 'react';
import {
  createChatSession,
  sendMessage,
  getSessionMessages,
  subscribeToSessionMessages,
  subscribeToSessionStatus,
  getOrCreateUserId,
  uploadChatImage,
  closeSessionWithTimeout,
} from '../lib/realtimeChat';

/**
 * Default inactivity timeout in minutes.
 * The chat session will be automatically closed if the user
 * does not send a message within this duration.
 */
const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 20;

/**
 * Hook for user-side real-time agent chat via Supabase Realtime.
 * Replaces the old WebSocket-based connection entirely.
 *
 * @param {Object} options
 * @param {number} [options.inactivityTimeoutMinutes=20] - Minutes of user inactivity before the session is auto-closed.
 *   Set to 0 or null to disable the timeout.
 */
export const useAgentConnection = ({ inactivityTimeoutMinutes = DEFAULT_INACTIVITY_TIMEOUT_MINUTES } = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [agentJoined, setAgentJoined] = useState(false);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  const messageSubRef = useRef(null);
  const statusSubRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const userId = useRef(getOrCreateUserId());
  const timeoutMinutesRef = useRef(inactivityTimeoutMinutes);

  // Keep the ref in sync if the prop changes
  useEffect(() => {
    timeoutMinutesRef.current = inactivityTimeoutMinutes;
  }, [inactivityTimeoutMinutes]);

  /**
   * Clear the inactivity timer
   */
  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  /**
   * Start or restart the inactivity timer.
   * When the timer fires, the session is closed with a timeout reason
   * and the session data is preserved in the database for agent history.
   */
  const resetInactivityTimer = useCallback((currentSession) => {
    clearInactivityTimer();

    const minutes = timeoutMinutesRef.current;
    // If timeout is disabled (0, null, or negative), do nothing
    if (!minutes || minutes <= 0) return;

    const timeoutMs = minutes * 60 * 1000;

    inactivityTimerRef.current = setTimeout(async () => {
      if (!currentSession?.id) return;

      try {
        // Close the session with a timeout system message
        // This preserves the session in the database for agent chat history
        await closeSessionWithTimeout(currentSession.id, minutes);
      } catch (err) {
        console.error('Failed to close timed-out session:', err);
      }

      // Update local state
      setSessionTimedOut(true);
      setIsConnected(false);
      setIsWaiting(false);
      setAgentJoined(false);
    }, timeoutMs);
  }, [clearInactivityTimer]);

  /**
   * Start a new agent chat session
   */
  const connectToAgent = useCallback(async (description = '') => {
    try {
      setIsWaiting(true);
      setMessages([]);
      setAgentJoined(false);
      setSessionTimedOut(false);

      // Create session in Supabase
      const newSession = await createChatSession(userId.current, {
        description,
        userAgent: navigator.userAgent,
        page: window.location.pathname,
      });

      setSession(newSession);

      // Send the initial description as first message
      if (description) {
        await sendMessage(newSession.id, 'user', userId.current, description);
      }

      // Subscribe to new messages in this session
      messageSubRef.current = subscribeToSessionMessages(newSession.id, (msg) => {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      // Subscribe to session status changes (agent joining, session closing)
      statusSubRef.current = subscribeToSessionStatus(newSession.id, (updatedSession) => {
        setSession(updatedSession);
        if (updatedSession.status === 'active' && updatedSession.agent_id) {
          setAgentJoined(true);
          setIsWaiting(false);
          setIsConnected(true);
          // Start the inactivity timer once the agent joins
          resetInactivityTimer(updatedSession);
        }
        if (updatedSession.status === 'closed') {
          setIsConnected(false);
          setIsWaiting(false);
          clearInactivityTimer();
        }
      });

      // Load any existing messages (in case of reconnection)
      const existingMessages = await getSessionMessages(newSession.id);
      if (existingMessages.length > 0) {
        setMessages(existingMessages);
      }

      return newSession;
    } catch (err) {
      console.error('Failed to create agent session:', err);
      setIsWaiting(false);
      throw err;
    }
  }, [resetInactivityTimer, clearInactivityTimer]);

  /**
   * Send a text message from the user side.
   * Resets the inactivity timer on each user message.
   */
  const sendUserMessage = useCallback(async (text) => {
    if (!session) {
      console.error('No active session');
      return;
    }
    try {
      await sendMessage(session.id, 'user', userId.current, text);
      // Reset inactivity timer — user is active
      resetInactivityTimer(session);
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  }, [session, resetInactivityTimer]);

  /**
   * Upload an image and send it as an attachment message.
   * Resets the inactivity timer on each user image send.
   * @param {File} file - PNG or JPEG image file
   */
  const sendImage = useCallback(async (file) => {
    if (!session) {
      console.error('No active session');
      return;
    }
    try {
      const imageUrl = await uploadChatImage(file, session.id);
      await sendMessage(session.id, 'user', userId.current, '[Image]', imageUrl);
      // Reset inactivity timer — user is active
      resetInactivityTimer(session);
      return imageUrl;
    } catch (err) {
      console.error('Failed to send image:', err);
      throw err;
    }
  }, [session, resetInactivityTimer]);

  /**
   * Disconnect and clean up subscriptions
   */
  const disconnect = useCallback(() => {
    clearInactivityTimer();
    if (messageSubRef.current) {
      messageSubRef.current.unsubscribe();
      messageSubRef.current = null;
    }
    if (statusSubRef.current) {
      statusSubRef.current.unsubscribe();
      statusSubRef.current = null;
    }
    setIsConnected(false);
    setIsWaiting(false);
    setSession(null);
    setAgentJoined(false);
    setSessionTimedOut(false);
  }, [clearInactivityTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectToAgent,
    sendMessage: sendUserMessage,
    sendImage,
    disconnect,
    isConnected,
    isWaiting,
    agentJoined,
    sessionTimedOut,
    messages,
    session,
    userId: userId.current,
  };
};
