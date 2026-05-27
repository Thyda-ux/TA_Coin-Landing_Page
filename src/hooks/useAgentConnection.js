import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAgentConnection({ inactivityTimeoutMinutes = 20 } = {}) {
  const [agentJoined, setAgentJoined] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const [inactivityDeadline, setInactivityDeadline] = useState(null);
  const [userId, setUserId] = useState(`user_${Math.random().toString(36).substring(2, 9)}`);
  const [channel, setChannel] = useState(null);

  // Extend the inactivity timeout whenever a message is sent or received
  const refreshTimeout = useCallback(() => {
    if (!inactivityTimeoutMinutes) return;
    setInactivityDeadline(Date.now() + inactivityTimeoutMinutes * 60 * 1000);
    setSessionTimedOut(false);
  }, [inactivityTimeoutMinutes]);

  const connectToAgent = async (issueDescription) => {
    setIsWaiting(true);
    setSessionTimedOut(false);
    refreshTimeout();

    // 1. Create a dedicated real-time channel for this specific user
    const roomName = `support_room_${userId}`;
    const newChannel = supabase.channel(roomName);

    // 2. Listen for agent joins and new messages
    newChannel
      .on('broadcast', { event: 'agent_joined' }, () => {
        setAgentJoined(true);
        setIsWaiting(false);
      })
      .on('broadcast', { event: 'new_message' }, (payload) => {
        setMessages((prev) => [...prev, payload.payload]);
        refreshTimeout();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Alert the admin dashboard that a user needs help
          await supabase.from('support_queue').insert({
            user_id: userId,
            issue: issueDescription,
            room: roomName,
            status: 'waiting'
          });
        }
      });

    setChannel(newChannel);
  };

  const sendMessage = async (text) => {
    if (!channel || sessionTimedOut) return;
    
    const msgPayload = {
      id: crypto.randomUUID(),
      sender_role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msgPayload]);
    refreshTimeout();

    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: msgPayload,
    });
  };

  const sendImage = async (file) => {
    if (!channel || sessionTimedOut) return;
    
    // In a full production app, you would upload to Supabase Storage first,
    // then broadcast the public URL. 
    const fakeImageUrl = URL.createObjectURL(file); 
    
    const msgPayload = {
      id: crypto.randomUUID(),
      sender_role: 'user',
      content: '[Image]',
      attachment_url: fakeImageUrl,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, msgPayload]);
    refreshTimeout();

    await channel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: msgPayload,
    });
  };

  const disconnect = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
    }
    setAgentJoined(false);
    setIsWaiting(false);
    setChannel(null);
    setMessages([]);
    setInactivityDeadline(null);
  }, [channel]);

  // Handle the automatic timeout monitor
  useEffect(() => {
    if (!inactivityDeadline) return;
    
    const interval = setInterval(() => {
      if (Date.now() > inactivityDeadline) {
        setSessionTimedOut(true);
        setInactivityDeadline(null);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [inactivityDeadline]);

  return {
    connectToAgent,
    sendMessage,
    sendImage,
    disconnect,
    isWaiting,
    agentJoined,
    sessionTimedOut,
    inactivityDeadline,
    messages,
    userId,
  };
}