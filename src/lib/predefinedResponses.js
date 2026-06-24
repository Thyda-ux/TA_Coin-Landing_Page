// Client-side pre-embedded responses for common chatter.
// Runs BEFORE the edge function so greetings, thanks, goodbye and
// "talk to agent" requests cost zero API calls and respond instantly
// even when Gemini is down or quota is exhausted.
//
// matchPredefinedResponse(userText) returns either:
//   { intent, action? }  -- handled; the caller localizes the text + options
//                            via i18n keys (chatbot.predefined.<intent>).
//   null                 -- no match, fall through to RAG

const GREETING_PATTERNS = [
  /^(hi|hello|hey|hiya|howdy|yo|sup|hola)$/i,
  /^(hi|hello|hey)\s+(there|guys?|team|bot)$/i,
  /^good\s*(morning|afternoon|evening|day)$/i,
  /^(gm|ge|gd)$/i,
  /^(greetings|salutations)$/i,
];

const THANKS_PATTERNS = [
  /^thanks?$/i,
  /^thank\s*you$/i,
  /^thanks?\s+(a\s+lot|so\s+much|very\s+much|you|again)$/i,
  /^(thx|tysm|ty|tq|thnks?)$/i,
  /^(awesome|great|perfect|cool|nice|amazing|excellent|brilliant|wonderful)$/i,
  /^appreciate\s*(it|that|you)?$/i,
  /^(got\s*it|understood|ok(ay)?)\s*,?\s*thanks?$/i,
];

const GOODBYE_PATTERNS = [
  /^(bye|goodbye|cya|farewell|adios)$/i,
  /^(see\s*(ya|you))(\s+(later|soon|around))?$/i,
  /^later$/i,
  /^that'?s\s*all(\s+for\s+now)?$/i,
  /^nothing\s*else$/i,
  /^i'?m\s*good(\s+thanks?)?$/i,
  /^no\s*thanks?$/i,
  /^no\s*thank\s*you$/i,
  /^all\s*good$/i,
];

const AGENT_TRIGGER_PATTERNS = [
  /^(i\s+(want|need|would\s+like)\s+to\s+)?(talk|speak|chat|connect)\s+(to|with)\s+(a\s+|an\s+)?(human|agent|person|representative|someone|real|live)/i,
  /^(can\s+i\s+)?(talk|speak)\s+to\s+(a\s+|an\s+)?(human|agent|person|representative|someone)/i,
  /^(real|live|human)\s+(person|agent|support)$/i,
  /^customer\s+(service|support)$/i,
  /^(agent|human|representative)$/i,
  /^connect\s+me(\s+to\s+(an?\s+)?(agent|human|person|live))?$/i,
  /^get\s+me\s+(an?\s+)?(agent|human|person)$/i,
];

const normalize = (text) =>
  String(text || '')
    .trim()
    .replace(/[!?.,;:]+$/g, '')
    .replace(/\s+/g, ' ');

const matchesAny = (text, patterns) => patterns.some((p) => p.test(text));

export function matchPredefinedResponse(userInput) {
  const text = normalize(userInput);
  if (!text) return null;

  if (matchesAny(text, AGENT_TRIGGER_PATTERNS)) return { intent: 'agent_request', action: 'OPEN_SUPPORT_FORM' };
  if (matchesAny(text, GREETING_PATTERNS)) return { intent: 'greeting', withOptions: true };
  if (matchesAny(text, THANKS_PATTERNS)) return { intent: 'thanks', withOptions: true };
  if (matchesAny(text, GOODBYE_PATTERNS)) return { intent: 'goodbye' };

  return null;
}
