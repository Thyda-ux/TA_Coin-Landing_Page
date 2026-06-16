const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 120;
const MAX_PHONE_LENGTH = 30;
const MAX_ISSUE_DETAILS_LENGTH = 1200;

function normalizeSpaces(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeSupportForm(form) {
  return {
    name: normalizeSpaces(form?.name || '').slice(0, MAX_NAME_LENGTH),
    email: normalizeSpaces(form?.email || '').toLowerCase().slice(0, MAX_EMAIL_LENGTH),
    phone: normalizeSpaces(form?.phone || '').slice(0, MAX_PHONE_LENGTH),
    issueType: normalizeSpaces(form?.issueType || ''),
    issueDetails: normalizeSpaces(form?.issueDetails || '').slice(0, MAX_ISSUE_DETAILS_LENGTH),
  };
}

export function validateSupportForm(form) {
  const normalized = normalizeSupportForm(form);
  const errors = {};

  if (!normalized.name) errors.name = 'Name is required.';
  if (!normalized.email) errors.email = 'Email is required.';
  if (!normalized.phone) errors.phone = 'Phone number is required.';
  if (!normalized.issueType) errors.issueType = 'Issue type is required.';
  // issueDetails is optional by request

  // Allow Unicode letters/marks (covers Khmer, Latin-accented, etc.),
  // spaces, apostrophes, hyphens, and periods. Required for legitimate
  // names like "O'Connor", "Jean-Luc", or Khmer script.
  if (normalized.name && !/^[\p{L}\p{M}'\-.\s]{2,80}$/u.test(normalized.name)) {
    errors.name = 'Please enter a valid name.';
  }

  // Phone: allow leading +, digits, spaces, parentheses, hyphens, and dots.
  // Requires at least 7 digits total.
  if (normalized.phone) {
    const digitCount = (normalized.phone.match(/\d/g) || []).length;
    if (!/^[+\d\s().-]{7,30}$/.test(normalized.phone) || digitCount < 7) {
      errors.phone = 'Please enter a valid phone number.';
    }
  }

  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  return {
    normalized,
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function buildSupportSummary(form) {
  return [
    'Support Request',
    `Customer Name: ${form.name}`,
    `Email: ${form.email}`,
    `Phone Number: ${form.phone}`,
    `Issue Type: ${form.issueType}`,
    `Issue Details: ${form.issueDetails}`,
  ].join('\n');
}

export async function createSupportTicket(supabaseClient, form) {
  // The RPC validates input server-side, attaches auth.uid() as chat_user_id,
  // and enforces a per-user rate limit. The legacy `extra.chatUserId`
  // argument is gone — the server determines the user from the auth context.
  const { data, error } = await supabaseClient.rpc('create_support_ticket', {
    p_customer_name: form.name,
    p_email: form.email,
    p_phone: form.phone,
    p_issue_type: form.issueType,
    p_issue_details: form.issueDetails || '',
  });

  if (error) throw error;
  return data;
}
