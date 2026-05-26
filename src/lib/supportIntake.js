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

  if (normalized.name && !/^[A-Za-z\s]{2,80}$/.test(normalized.name)) {
    errors.name = 'Name should contain letters only (no numbers or symbols).';
  }

  if (normalized.phone && !/^[0-9]{7,30}$/.test(normalized.phone)) {
    errors.phone = 'Phone number should contain digits only.';
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

export async function createSupportTicket(supabaseClient, form, extra = {}) {
  const payload = {
    customer_name: form.name,
    email: form.email,
    phone_number: form.phone,
    issue_type: form.issueType,
    issue_details: form.issueDetails,
    source: extra.source || 'chatbot',
    status: extra.status || 'new',
    chat_user_id: extra.chatUserId || null,
    metadata: extra.metadata || {},
  };

  const { data, error } = await supabaseClient
    .from('support_tickets')
    .insert(payload)
    .select('id, ticket_no')
    .single();

  if (error) throw error;
  return data;
}
