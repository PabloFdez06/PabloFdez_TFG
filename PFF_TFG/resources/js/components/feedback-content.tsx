import { Fragment } from 'react';
import type { ReactNode } from 'react';
import type { FeedbackBlock } from '@/lib/feedback-parser';

type FeedbackContentProps = {
    blocks: FeedbackBlock[];
};

function renderInlineFeedback(text: string): ReactNode[] {
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\((?:https?:\/\/[^)\s]+)\))/g);

    return tokens
        .filter((token): token is string => typeof token === 'string' && token !== '')
        .map((token, tokenIndex) => {
            const inlineCodeMatch = token.match(/^`([^`]+)`$/);

            if (inlineCodeMatch) {
                return <code key={`feedback-inline-code-${tokenIndex}`}>{inlineCodeMatch[1]}</code>;
            }

            const strongMatch = token.match(/^(?:\*\*|__)(.+?)(?:\*\*|__)$/);

            if (strongMatch) {
                return <strong key={`feedback-strong-${tokenIndex}`}>{strongMatch[1]}</strong>;
            }

            const emphasisMatch = token.match(/^(?:\*|_)(.+?)(?:\*|_)$/);

            if (emphasisMatch) {
                return <em key={`feedback-em-${tokenIndex}`}>{emphasisMatch[1]}</em>;
            }

            const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);

            if (linkMatch) {
                return (
                    <a key={`feedback-link-${tokenIndex}`} href={linkMatch[2]} target="_blank" rel="noreferrer">
                        {linkMatch[1]}
                    </a>
                );
            }

            return token;
        });
}

export default function FeedbackContent({ blocks }: FeedbackContentProps) {
    if (blocks.length === 0) {
        return <p>Sin retroalimentacion disponible.</p>;
    }

    return (
        <>
            {blocks.map((block, blockIndex) => {
                if (block.type === 'heading') {
                    const HeadingTag = (`h${Math.min(Math.max(block.level, 3), 6)}` as 'h3' | 'h4' | 'h5' | 'h6');

                    return <HeadingTag key={`feedback-heading-${blockIndex}`}>{renderInlineFeedback(block.text)}</HeadingTag>;
                }

                if (block.type === 'list') {
                    const ListTag = block.ordered ? 'ol' : 'ul';

                    return (
                        <ListTag key={`feedback-list-${blockIndex}`}>
                            {block.items.map((item, itemIndex) => (
                                <li key={`feedback-item-${blockIndex}-${itemIndex}`}>{renderInlineFeedback(item)}</li>
                            ))}
                        </ListTag>
                    );
                }

                if (block.type === 'table') {
                    return (
                        <section className="p-calificaciones__feedback-table-wrap" key={`feedback-table-${blockIndex}`}>
                            <table className="p-calificaciones__feedback-table">
                                <thead>
                                    <tr>
                                        {block.headers.map((header, headerIndex) => (
                                            <th key={`feedback-table-header-${blockIndex}-${headerIndex}`} scope="col">
                                                {renderInlineFeedback(header)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {block.rows.map((row, rowIndex) => (
                                        <tr key={`feedback-table-row-${blockIndex}-${rowIndex}`}>
                                            {row.map((cell, cellIndex) => (
                                                <td key={`feedback-table-cell-${blockIndex}-${rowIndex}-${cellIndex}`}>
                                                    {renderInlineFeedback(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    );
                }

                if (block.type === 'blockquote') {
                    return (
                        <blockquote key={`feedback-blockquote-${blockIndex}`}>
                            {block.lines.map((line, lineIndex) => (
                                <Fragment key={`feedback-blockquote-line-${blockIndex}-${lineIndex}`}>
                                    {renderInlineFeedback(line)}
                                    {lineIndex < block.lines.length - 1 ? <br /> : null}
                                </Fragment>
                            ))}
                        </blockquote>
                    );
                }

                if (block.type === 'code') {
                    return (
                        <pre key={`feedback-code-${blockIndex}`}>
                            <code>{block.lines.join('\n')}</code>
                        </pre>
                    );
                }

                return (
                    <p key={`feedback-paragraph-${blockIndex}`}>
                        {block.lines.map((line, lineIndex) => (
                            <Fragment key={`feedback-line-${blockIndex}-${lineIndex}`}>
                                {renderInlineFeedback(line)}
                                {lineIndex < block.lines.length - 1 ? <br /> : null}
                            </Fragment>
                        ))}
                    </p>
                );
            })}
        </>
    );
}
