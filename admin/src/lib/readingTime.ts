const WORDS_PER_MINUTE = 200;

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/[*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeReadingTime(markdown: string): number {
  const plainText = stripMarkdown(markdown);
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;

  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}