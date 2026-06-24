import { supabase } from './supabase';

/**
 * Sends the user's message and chat history to the Agentic Edge Function.
 * The Edge Function handles the RAG routing, embedding, and Gemini generation.
 * * @param {string} userMessage - The text the user just typed.
 * @param {Array} chatHistory - The array of previous messages for context memory.
 * @returns {Promise<{text: string, action: string|null}>} The generated response from the AI.
 */
export async function askSupportBot(userMessage, chatHistory = [], lang = 'en') {
  try {
    // 1. Prepare the payload exactly as the Edge Function expects it.
    //    `lang` ('en' | 'km' | 'zh') tells the edge function which language to
    //    generate the answer in and which stored FAQ translation to prefer.
    const payload = {
      query: userMessage,
      history: chatHistory,
      lang
    };

    // 2. Call the Edge Function via the Supabase Client
    const { data, error } = await supabase.functions.invoke('agentic-support-bot', {
      body: payload
    });

    if (error) {
      console.error("Supabase Edge Function Error:", error);
      throw error;
    }

    // 3. Return the parsed data (text and potential UI action)
    return {
      text: data?.text || "I'm having trouble processing that right now.",
      action: data?.action || null
    };

  } catch (error) {
    console.error("Critical error in askSupportBot:", error);
    throw error; // Let the React hook catch this and show the fallback message
  }
}