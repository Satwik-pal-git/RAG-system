import React from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Parse markdown into HTML safely with line breaks and github flavored markdown
  const html = marked.parse(content, {
    breaks: true,
    gfm: true,
  });

  return (
    <div
      className={`markdown-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html as string }}
    />
  );
};
export default MarkdownRenderer;
