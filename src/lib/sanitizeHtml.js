import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'blockquote', 'code', 'pre',
  'span', 'div',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel'];

const CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'style'],
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    const href = node.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#')) {
      node.removeAttribute('href');
    }
    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }
});

export function sanitizeRichHtml(html) {
  if (typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, CONFIG);
}
