/**
 * Creates a concise summary of Markdown text, removing basic formatting 
 * for length calculation and truncating if necessary.
 * 
 * @param markdown The input Markdown string (or null/undefined).
 * @param maxLength The maximum length of the summary before truncation.
 * @returns The summarized plain text, or null if the input was null/undefined.
 */
export const summarizeMarkdown = (markdown: string | null | undefined, maxLength: number = 150): string | null => {
    if (!markdown) return null;
    // Remove markdown formatting for summary length calculation (basic approach)
    const plainText = markdown
      .replace(/[`*_[\]()#+-]/g, '') // Remove common markdown chars
      .replace(/\n\s*\n/g, ' \n ') // Replace double newlines with space-newline-space
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return `${plainText.substring(0, maxLength)}...`;
  }; 