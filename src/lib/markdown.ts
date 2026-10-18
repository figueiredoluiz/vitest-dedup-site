import { marked } from 'marked';

// Release-note markdown comes from this project's own repository, where only
// the owner can write releases. Sanitize before ever rendering third-party
// markdown through this helper.
export const renderMarkdown = async (markdown: string): Promise<string> => {
  const html = await marked.parse(markdown, { async: true, gfm: true });
  return html.trim();
};
