export type FeedbackBlock =
    | {
          type: 'heading';
          level: 1 | 2 | 3 | 4 | 5 | 6;
          text: string;
      }
    | {
          type: 'paragraph';
          lines: string[];
      }
    | {
          type: 'list';
          ordered: boolean;
          items: string[];
      }
    | {
          type: 'table';
          headers: string[];
          rows: string[][];
      }
    | {
          type: 'blockquote';
          lines: string[];
      }
    | {
          type: 'code';
          language: string;
          lines: string[];
      };

function splitTableColumns(line: string): string[] {
    return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((column) => column.trim());
}

function isTableSeparatorLine(line: string): boolean {
    const normalized = line.trim().replace(/^\|/, '').replace(/\|$/, '');

    if (normalized === '') {
        return false;
    }

    return normalized.split('|').every((segment) => /^:?-{3,}:?$/.test(segment.trim()));
}

function isSpecialBlockStart(line: string): boolean {
    const trimmed = line.trim();

    return (
        /^#{1,6}\s+/.test(trimmed)
        || /^```/.test(trimmed)
        || /^>\s?/.test(trimmed)
        || /^\d+[.)]\s+/.test(trimmed)
        || /^[-*•]\s+/.test(trimmed)
    );
}

export function formatFeedbackToBlocks(feedback: string): FeedbackBlock[] {
    const normalizedFeedback = feedback.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    if (normalizedFeedback === '') {
        return [];
    }

    const lines = normalizedFeedback.split('\n');
    const blocks: FeedbackBlock[] = [];
    let lineIndex = 0;

    while (lineIndex < lines.length) {
        const currentLine = lines[lineIndex].trim();

        if (currentLine === '') {
            lineIndex += 1;
            continue;
        }

        const headingMatch = currentLine.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            blocks.push({
                type: 'heading',
                level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
                text: headingMatch[2].trim(),
            });
            lineIndex += 1;
            continue;
        }

        if (/^```/.test(currentLine)) {
            const language = currentLine.replace(/^```/, '').trim();
            const codeLines: string[] = [];
            lineIndex += 1;

            while (lineIndex < lines.length && !/^```/.test(lines[lineIndex].trim())) {
                codeLines.push(lines[lineIndex]);
                lineIndex += 1;
            }

            if (lineIndex < lines.length && /^```/.test(lines[lineIndex].trim())) {
                lineIndex += 1;
            }

            blocks.push({
                type: 'code',
                language,
                lines: codeLines,
            });
            continue;
        }

        if (
            currentLine.includes('|')
            && lineIndex + 1 < lines.length
            && isTableSeparatorLine(lines[lineIndex + 1])
        ) {
            const headers = splitTableColumns(lines[lineIndex]);
            const rows: string[][] = [];
            lineIndex += 2;

            while (lineIndex < lines.length) {
                const rowLine = lines[lineIndex].trim();

                if (rowLine === '' || !rowLine.includes('|')) {
                    break;
                }

                rows.push(splitTableColumns(lines[lineIndex]));
                lineIndex += 1;
            }

            blocks.push({
                type: 'table',
                headers,
                rows,
            });
            continue;
        }

        if (/^>\s?/.test(currentLine)) {
            const quoteLines: string[] = [];

            while (lineIndex < lines.length && /^>\s?/.test(lines[lineIndex].trim())) {
                quoteLines.push(lines[lineIndex].trim().replace(/^>\s?/, ''));
                lineIndex += 1;
            }

            blocks.push({
                type: 'blockquote',
                lines: quoteLines,
            });
            continue;
        }

        const isOrderedListStart = /^\d+[.)]\s+/.test(currentLine);
        const isUnorderedListStart = /^[-*•]\s+/.test(currentLine);

        if (isOrderedListStart || isUnorderedListStart) {
            const listItems: string[] = [];
            const listPattern = isOrderedListStart ? /^\d+[.)]\s+/ : /^[-*•]\s+/;

            while (lineIndex < lines.length && listPattern.test(lines[lineIndex].trim())) {
                listItems.push(lines[lineIndex].trim().replace(listPattern, '').trim());
                lineIndex += 1;
            }

            blocks.push({
                type: 'list',
                ordered: isOrderedListStart,
                items: listItems,
            });
            continue;
        }

        const paragraphLines: string[] = [];

        while (lineIndex < lines.length) {
            const paragraphCandidate = lines[lineIndex].trim();

            if (paragraphCandidate === '') {
                lineIndex += 1;
                break;
            }

            if (paragraphLines.length > 0 && isSpecialBlockStart(paragraphCandidate)) {
                break;
            }

            paragraphLines.push(paragraphCandidate);
            lineIndex += 1;
        }

        if (paragraphLines.length > 0) {
            blocks.push({
                type: 'paragraph',
                lines: paragraphLines,
            });
        }
    }

    return blocks;
}
