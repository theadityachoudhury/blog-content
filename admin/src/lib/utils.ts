export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeDoubleQuotedYaml(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function postFilename(date: string, slug: string): string {
  return `${date}-${slug}.md`;
}

export function buildFileContent(
  meta: { title: string; date: string; description: string; tags: string[]; draft: boolean },
  body: string,
): string {
  const tags = meta.tags.map((t) => t.trim()).filter(Boolean);
  const frontmatter = [
    '---',
    `title: "${escapeDoubleQuotedYaml(meta.title)}"`,
    `date: ${meta.date}`,
    `description: "${escapeDoubleQuotedYaml(meta.description)}"`,
    `tags: [${tags.join(', ')}]`,
    `draft: ${meta.draft}`,
    '---',
    '',
  ].join('\n');
  return frontmatter + body.trim() + '\n';
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('\n---', 3);
  return end === -1 ? content : content.slice(end + 4).trimStart();
}

export { computeReadingTime } from './readingTime';
