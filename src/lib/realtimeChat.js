import { supabase } from './supabase';

// All writes go through SECURITY DEFINER RPCs (see
// supabase/migrations/security_hardening.sql). The server picks the agent,
// stamps timers, and inserts system messages. The client only triggers RPCs
// and reads its own session via RLS.

/**
 * Ensure the supabase client has an authenticated session. Anonymous
 * sign-in must be enabled in the dashboard (Authentication → Providers).
 * Returns the auth user, or throws if sign-in failed.
 */
export async function ensureAnonAuth() {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) return data.session.user;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signed.user;
}

/**
 * Create a new chat session for a user requesting agent support.
 * The server picks the agent, sets the timer, and posts the system welcome.
 *
 * @param {Object} metadata - Free-form context (description, customerName,
 *   email, phone, issueType, issueDescription, userAgent, page, etc.)
 * @returns {Promise<chat_sessions row>}
 */
export async function createChatSession(metadata = {}) {
  await ensureAnonAuth();
  const initialMessage = metadata.description || null;
  const { data, error } = await supabase.rpc('create_chat_session', {
    p_metadata: metadata,
    p_initial_message: initialMessage,
  });
  if (error) throw error;
  // RPC returns a single record (the chat_sessions row)
  return data;
}

/**
 * Close a chat session via the RPC. The server posts a system message and
 * flips status to 'closed' atomically.
 */
export async function closeSession(sessionId, reason = 'closed by user') {
  const { data, error } = await supabase.rpc('close_chat_session', {
    p_session_id: sessionId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

/**
 * Close a chat session due to inactivity. The server posts the system
 * message explaining the reason and flips status to 'closed'.
 */
export async function closeSessionWithTimeout(sessionId, timeoutMinutes) {
  return closeSession(
    sessionId,
    `This chat session has been automatically closed due to ${timeoutMinutes} minutes of user inactivity. The conversation history is preserved.`,
  );
}

/**
 * Get all waiting/active sessions (for agent dashboard)
 */
export async function getActiveSessions() {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// â”€â”€â”€ Message Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Send a user message in a chat session via the RPC.
 * The RPC validates session ownership, attaches the auth.uid() as sender_id,
 * stamps timer columns, and writes the message row in one transaction.
 *
 * Signature kept compatible with previous callers (senderRole and senderId
 * are ignored — server determines them from auth context).
 */
export async function sendMessage(sessionId, senderRole, senderId, content, attachmentUrl = null) {
  if (senderRole && senderRole !== 'user' && senderRole !== 'customer') {
    throw new Error(`sendMessage from client only supports 'user' role; got '${senderRole}'`);
  }
  const { data, error } = await supabase.rpc('send_user_message', {
    p_session_id: sessionId,
    p_content: content ?? '',
    p_attachment_url: attachmentUrl,
  });
  if (error) throw error;
  return data;
}

// â”€â”€â”€ Image Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

export function getFileExtension(fileName = '') {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function isAllowedImageFile(file) {
  const mimeType = (file?.type || '').toLowerCase();
  const extension = getFileExtension(file?.name || '');
  return ALLOWED_IMAGE_TYPES.includes(mimeType) || ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

/**
 * Upload an image to Supabase Storage for chat attachments.
 * Only PNG and JPEG files are accepted, max 5 MB.
 * @param {File} file - The image file to upload
 * @param {string} sessionId - The chat session ID (used for folder organization)
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadChatImage(file, sessionId) {
  if (!file) throw new Error('No file provided');

  if (!isAllowedImageFile(file)) {
    throw new Error('Only PNG and JPEG images are allowed');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be smaller than 5 MB');
  }

  const fileExt = getFileExtension(file.name);
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const fileName = `${sessionId}/${Date.now()}_${uuid}.${fileExt}`;
  const contentType = file.type || (fileExt === 'png' ? 'image/png' : 'image/jpeg');

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, file, {
      contentType,
      cacheControl: '3600',
    });

  if (uploadError) {
    if (uploadError.message?.toLowerCase().includes('bucket')) {
      throw new Error(
        'Upload failed: Supabase storage bucket "chat-attachments" is missing or inaccessible.'
      );
    }
    if (uploadError.message?.toLowerCase().includes('row-level security')) {
      throw new Error(
        'Upload failed: Storage policy blocked this upload. Check INSERT policy for "chat-attachments".'
      );
    }
    throw uploadError;
  }

  // Bucket is private (security hardening). Return a long-lived signed URL
  // (7 days) — fine because chat sessions auto-close after 20 minutes of
  // inactivity, so the URL effectively dies with the conversation.
  const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
  const { data: signedData, error: signError } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS);

  if (signError) throw signError;
  return signedData.signedUrl;
}

/**
 * Get all messages for a session
 */
export async function getSessionMessages(sessionId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// â”€â”€â”€ Realtime Subscriptions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Subscribe to new messages in a specific session (for both user and agent)
 */
export function subscribeToSessionMessages(sessionId, onMessage) {
  const channel = supabase
    .channel(`chat-messages-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe((status, err) => {
      if (err && import.meta.env?.DEV) console.warn(`Realtime messages channel error (${status}):`, err);
    });

  return channel;
}

/**
 * Subscribe to session status changes (for user to know when agent joins)
 */
export function subscribeToSessionStatus(sessionId, onStatusChange) {
  const channel = supabase
    .channel(`chat-session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        onStatusChange(payload.new);
      }
    )
    .subscribe((status, err) => {
      if (err && import.meta.env?.DEV) console.warn(`Realtime session channel error (${status}):`, err);
    });

  return channel;
}

/**
 * Subscribe to all session changes (for agent dashboard)
 */
export function subscribeToAllSessions(onSessionChange) {
  const channel = supabase
    .channel('agent-dashboard-sessions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_sessions',
      },
      (payload) => {
        onSessionChange(payload.eventType, payload.new, payload.old);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Presence channel for typing indicators
 */
export function createPresenceChannel(sessionId, userId, role) {
  const channel = supabase.channel(`presence-${sessionId}`, {
    config: { presence: { key: userId } },
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId, role, online_at: new Date().toISOString() });
    }
  });

  return channel;
}

// â”€â”€â”€ Utility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Returns the current auth.uid() as a string, signing in anonymously if
 * the user has no session yet. Replaces the legacy getOrCreateUserId()
 * that read from localStorage.
 */
export async function getCurrentUserId() {
  const user = await ensureAnonAuth();
  return user?.id || null;
}

/**
 * Generate a unique agent ID
 */
export function getOrCreateAgentId() {
  let agentId = localStorage.getItem('tacoin_agent_id');
  if (!agentId) {
    agentId = 'agent_' + crypto.randomUUID();
    localStorage.setItem('tacoin_agent_id', agentId);
  }
  return agentId;
}


