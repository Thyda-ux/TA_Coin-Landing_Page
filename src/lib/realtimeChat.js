import { supabase } from './supabase';

/**
 * Supabase Realtime Chat Service
 * Replaces the WebSocket-based agent-server.js with Supabase Realtime channels.
 * No separate server needed — works globally out of the box.
 */

// ─── Session Management ───────────────────────────────────────────

/**
 * Create a new chat session for a user requesting agent support
 */
export async function createChatSession(userId, metadata = {}) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      status: 'waiting',
      metadata,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Agent claims a waiting session
 */
export async function claimSession(sessionId, agentId) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .update({ status: 'active', agent_id: agentId })
    .eq('id', sessionId)
    .eq('status', 'waiting')
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Close a chat session
 */
export async function closeSession(sessionId) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .update({ status: 'closed' })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
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

// ─── Message Management ───────────────────────────────────────────

/**
 * Send a message in a chat session
 * @param {string} sessionId - The chat session ID
 * @param {string} senderRole - 'user' | 'agent' | 'system'
 * @param {string} senderId - The sender's unique ID
 * @param {string} content - Text content of the message
 * @param {string|null} attachmentUrl - Optional URL of an uploaded image attachment
 */
export async function sendMessage(sessionId, senderRole, senderId, content, attachmentUrl = null) {
  const payload = {
    session_id: sessionId,
    sender_role: senderRole,
    sender_id: senderId,
    content,
  };

  if (attachmentUrl) {
    payload.attachment_url = attachmentUrl;
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Image Upload ─────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Upload an image to Supabase Storage for chat attachments.
 * Only PNG and JPEG files are accepted, max 5 MB.
 * @param {File} file - The image file to upload
 * @param {string} sessionId - The chat session ID (used for folder organization)
 * @returns {Promise<string>} The public URL of the uploaded image
 */
export async function uploadChatImage(file, sessionId) {
  if (!file) throw new Error('No file provided');

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only PNG and JPEG images are allowed');
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be smaller than 5 MB');
  }

  const fileExt = file.name.split('.').pop().toLowerCase();
  const fileName = `${sessionId}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
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

// ─── Realtime Subscriptions ───────────────────────────────────────

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
    .subscribe();

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
    .subscribe();

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

// ─── Utility ──────────────────────────────────────────────────────

/**
 * Generate a unique anonymous user ID
 */
export function getOrCreateUserId() {
  let userId = localStorage.getItem('tacoin_chat_user_id');
  if (!userId) {
    userId = 'user_' + crypto.randomUUID();
    localStorage.setItem('tacoin_chat_user_id', userId);
  }
  return userId;
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
