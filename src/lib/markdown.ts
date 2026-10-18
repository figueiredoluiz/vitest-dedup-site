import { marked } from 'marked';

// Renders trusted local fixtures only. Sanitize before pointing this at
// remote sources such as the GitHub Releases API.
export const renderMarkdown = async (markdown: string): Promise<string> => {
  const html = await marked.parse(markdown, { async: true, gfm: true });
  return html.trim();
};
