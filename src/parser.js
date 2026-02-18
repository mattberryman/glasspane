/**
 * parseScript
 * @param {string} text - raw .md file content
 * @returns {{ title: string, blocks: Array }[]}
 */
export function parseScript(text) {
  const lines = text.split('\n');
  const slides = [];
  let current = { title: '', blocks: [] };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line || line === '---') continue;

    // Slide boundary
    if (line.startsWith('## ')) {
      if (current.blocks.length > 0 || current.title) {
        slides.push(current);
      }
      current = { title: line.slice(3).trim(), blocks: [] };
      continue;
    }

    // Block-level cue: line is *only* [TAG optional note]
    // The tag must begin with an uppercase word. After the all-caps keyword(s)
    // the rest is free-form note text (may include lowercase, punctuation, etc.).
    const blockMatch = line.match(/^\[([A-Z][A-Z ]*(?:[\s\u2014\-.,!?].*)?)\]$/);
    if (blockMatch) {
      const tag = blockMatch[1].trim();
      if (tag === 'CLICK') {
        current.blocks.push({ type: 'click' });
      } else if (tag.startsWith('NOTE')) {
        current.blocks.push({ type: 'note', text: tag.slice(4).trim() });
      } else {
        // PAUSE, LOOK UP, SMILE, and any other all-caps cue
        const spaceIdx = tag.indexOf(' ');
        const note = spaceIdx >= 0 ? tag.slice(spaceIdx).trim() : '';
        current.blocks.push({ type: 'pause', note });
      }
      continue;
    }

    // Spoken line — process inline markup
    current.blocks.push({ type: 'line', html: processInline(line) });
  }

  slides.push(current);
  return slides;
}

/**
 * processInline — converts a plain text line to safe HTML.
 * Escapes HTML entities first, then applies markup.
 * The result must still pass through DOMPurify before DOM insertion.
 * @param {string} text
 * @returns {string}
 */
function processInline(text) {
  // 1. Escape HTML entities to prevent injection
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. **bold** → slow emphasis span
  html = html.replace(/\*\*(.+?)\*\*/g, '<span class="slow">$1</span>');

  // 3. [ALL CAPS] inline direction — only matches all-caps content
  html = html.replace(/\[([A-Z][A-Z0-9 ]*(?:[\u2014\-.,!?\s].*)?)\]/g, '<span class="d">[$1]</span>');

  return html;
}
