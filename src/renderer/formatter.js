/**
 * Markdown Formatter - Real-time formatting for Simple Notes
 * Handles $$title$$, $subtitle$, *italic*, **bold**, _underline_, [monospace]
 */

class MarkdownFormatter {
  /**
   * Update the formatted preview with markdown rendering
   * @param {HTMLTextAreaElement} editor - The textarea element
   * @param {HTMLElement} preview - The preview element
   */
  static updateFormattedPreview(editor, preview) {
    const text = editor.value;
    const formattedText = this.formatText(text);
    
    preview.innerHTML = formattedText;
    
    // Sync scroll position
    preview.scrollTop = editor.scrollTop;
    preview.scrollLeft = editor.scrollLeft;
  }

  /**
   * Format text with markdown syntax
   * @param {string} text - Raw text to format
   * @returns {string} HTML formatted text
   */
  static formatText(text) {
    let formattedText = this.escapeHtml(text);
    
    // Process titles ($$text$$) - must be done before subtitles
    formattedText = formattedText.replace(/\$\$(.*?)\$\$/g, (match, content) => {
      return `<span class="markdown-syntax">$$</span><span class="markdown-title">${content}</span><span class="markdown-syntax">$$</span>`;
    });
    
    // Process subtitles ($text$) - exclude already processed titles
    formattedText = formattedText.replace(/(?<!<span class="markdown-syntax">)\$([^$]+?)\$(?!<\/span>)/g, (match, content) => {
      return `<span class="markdown-syntax">$</span><span class="markdown-subtitle">${content}</span><span class="markdown-syntax">$</span>`;
    });
    
    // Process monospaced text ([text])
    formattedText = formattedText.replace(/\[([^\]]+?)\]/g, (match, content) => {
      return `<span class="markdown-syntax">[</span><span class="markdown-monospace">${content}</span><span class="markdown-syntax">]</span>`;
    });
    
    // Process bold (**text**) - must be done before italic
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      return `<span class="markdown-syntax">**</span><span class="markdown-bold">${content}</span><span class="markdown-syntax">**</span>`;
    });
    
    // Process italic (*text*) - exclude already processed bold
    formattedText = formattedText.replace(/(?<!<span class="markdown-syntax">)\*([^*]+?)\*(?!<\/span>)/g, (match, content) => {
      return `<span class="markdown-syntax">*</span><span class="markdown-italic">${content}</span><span class="markdown-syntax">*</span>`;
    });
    
    // Process underline (_text_)
    formattedText = formattedText.replace(/_([^_]+?)_/g, (match, content) => {
      return `<span class="markdown-syntax">_</span><span class="markdown-underline">${content}</span><span class="markdown-syntax">_</span>`;
    });

    return formattedText;
  }

  /**
   * Escape HTML characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Setup scroll synchronization between editor and preview
   * @param {HTMLTextAreaElement} editor - The textarea element
   * @param {HTMLElement} preview - The preview element
   */
  static setupScrollSync(editor, preview) {
    editor.addEventListener('scroll', () => {
      preview.scrollTop = editor.scrollTop;
      preview.scrollLeft = editor.scrollLeft;
    });
  }

  /**
   * Insert markdown formatting at cursor position
   * @param {HTMLTextAreaElement} editor - The textarea element
   * @param {string} prefix - Text to insert before selection
   * @param {string} suffix - Text to insert after selection
   */
  static insertFormatting(editor, prefix, suffix = '') {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const before = editor.value.substring(0, start);
    const after = editor.value.substring(end);
    
    const newText = before + prefix + selectedText + suffix + after;
    editor.value = newText;
    
    // Update cursor position
    const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
    editor.setSelectionRange(newCursorPos, newCursorPos);
    
    // Trigger input event to update formatting
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /**
   * Add keyboard shortcuts for formatting
   * @param {HTMLTextAreaElement} editor - The textarea element
   */
  static addKeyboardShortcuts(editor) {
    editor.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + H for title
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        this.insertFormatting(editor, '$$', '$$');
      }
      
      // Ctrl/Cmd + J for subtitle
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        this.insertFormatting(editor, '$', '$');
      }
      
      // Ctrl/Cmd + M for monospace
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        this.insertFormatting(editor, '[', ']');
      }
      
      // Ctrl/Cmd + B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.insertFormatting(editor, '**', '**');
      }
      
      // Ctrl/Cmd + I for italic
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        this.insertFormatting(editor, '*', '*');
      }
      
      // Ctrl/Cmd + U for underline
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        this.insertFormatting(editor, '_', '_');
      }
    });
  }
}

// Make formatter available globally
window.MarkdownFormatter = MarkdownFormatter;