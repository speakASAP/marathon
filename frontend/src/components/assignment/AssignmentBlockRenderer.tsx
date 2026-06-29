import type { AssignmentBlock, AssignmentInlineRun } from "../../api/assignmentMarathon";
import { ensureTerminalPunctuation, isReadingRulesTitle, stripHeadingTerminalPeriod } from "./assignmentBlockNormalization";
import { AssignmentFieldRenderer } from "./AssignmentFieldRenderer";
import type { AnswerValue, Answers } from "./assignmentRendererTypes";
import { KnownWordsBlock } from "./KnownWordsBlock";
import { mediaAudioUrl, youtubeEmbedUrl } from "./media";

type AssignmentBlockRendererProps = {
  block: AssignmentBlock;
  answers: Answers;
  readOnly: boolean;
  validationError?: string;
  onAnswerChange: (name: string, value: AnswerValue) => void;
};

function isDownloadHref(href: string) {
  return /\.(?:pdf|zip|docx?|xlsx?|pptx?|mp3|mp4|wav|ogg)(?:[?#]|$)/i.test(href);
}

const SPEAKASAP_YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@Speak_ASAP";
const SPEAKASAP_YOUTUBE_VIEWS_CONTEXT = "миллионы просмотров на youtube";
const SPEAKASAP_YOUTUBE_VIEWS_PREFIX = "миллионы просмотров на ";
const SPEAKASAP_YOUTUBE_LINK_TEXT = "youtube";

type InlineLink = {
  text: string;
  href: string;
  index: number;
};

function inlineLinksForText(text: string, links?: Array<{ text: string; href: string }>): InlineLink[] {
  const configuredLinks: InlineLink[] = [];
  let searchFrom = 0;
  for (const link of links || []) {
    if (!link.text || !link.href) continue;
    let index = text.indexOf(link.text, searchFrom);
    if (index < 0) index = text.indexOf(link.text);
    if (index < 0) continue;
    configuredLinks.push({ ...link, index });
    searchFrom = index + link.text.length;
  }

  const youtubeContextIndex = text.indexOf(SPEAKASAP_YOUTUBE_VIEWS_CONTEXT);
  if (youtubeContextIndex >= 0) {
    const youtubeIndex = youtubeContextIndex + SPEAKASAP_YOUTUBE_VIEWS_PREFIX.length;
    const hasConfiguredYoutubeLink = configuredLinks.some((link) => (
      link.index <= youtubeIndex &&
      youtubeIndex < link.index + link.text.length
    ));

    if (!hasConfiguredYoutubeLink) {
      configuredLinks.push({
        text: SPEAKASAP_YOUTUBE_LINK_TEXT,
        href: SPEAKASAP_YOUTUBE_CHANNEL_URL,
        index: youtubeIndex,
      });
    }
  }

  return configuredLinks.sort((a, b) => a.index - b.index);
}

function renderRichRun(run: AssignmentInlineRun, key: string) {
  const classNames = [
    run.marks?.includes("strong") ? "step-rich-strong" : "",
    run.marks?.includes("em") ? "step-rich-em" : "",
    run.tone ? `step-rich-${run.tone}` : "",
  ].filter(Boolean).join(" ");
  const body = <span className={classNames || undefined}>{run.text}</span>;
  if (!run.href) return <span key={key}>{body}</span>;
  return <a className="step-assignment-link" href={run.href} key={key} target="_blank" rel="noopener noreferrer">{body}</a>;
}

function renderRichInlineText(content?: AssignmentInlineRun[]) {
  const runs = (content || []).filter((run) => run.text);
  if (!runs.length) return null;
  return runs.map((run, index) => renderRichRun(run, `run-${index}`));
}

function renderInlineLinkedText(text: string, links?: Array<{ text: string; href: string }>, content?: AssignmentInlineRun[]) {
  const rich = renderRichInlineText(content);
  if (rich) return rich;
  const normalizedLinks = inlineLinksForText(text, links);
  if (!normalizedLinks.length) return text;

  const parts: JSX.Element[] = [];
  let cursor = 0;
  let key = 0;

  for (const link of normalizedLinks) {
    if (link.index < cursor) continue;
    const before = text.slice(cursor, link.index);
    if (before) parts.push(<span key={`text-${key++}`}>{before}</span>);
    parts.push(
      <a className="step-assignment-link" href={link.href} key={`link-${key++}`} target="_blank" rel="noopener noreferrer">
        {link.text}
      </a>,
    );
    cursor = link.index + link.text.length;
  }

  const remaining = text.slice(cursor);
  if (remaining) parts.push(<span key={`text-${key++}`}>{remaining}</span>);
  return parts.length ? parts : text;
}

function readingRuleParts(item: string) {
  const normalized = item.replace(/\s+/g, " ").trim();
  const pronounced = normalized.match(/^(.+?)\s+читается\s+как\s+([^,]+),?\s*(.*)$/i);
  if (pronounced) {
    return { symbol: pronounced[1].trim(), sound: `читается как ${pronounced[2].trim()}`, example: pronounced[3].trim() };
  }

  const dashed = normalized.match(/^(.+?)\s+-\s+(\[[^\]]+\])\s*-?\s*(.*)$/);
  if (dashed) {
    return { symbol: dashed[1].trim(), sound: dashed[2].trim(), example: dashed[3].trim() };
  }

  return { symbol: normalized, sound: "", example: "" };
}

function listItemText(item: string | { text?: string; blocks?: AssignmentBlock[] }) {
  return typeof item === "string" ? item : item.text || "";
}

function renderListItem(item: string | { text?: string; links?: Array<{ text: string; href: string }>; content?: AssignmentInlineRun[]; blocks?: AssignmentBlock[] }, blockId: string) {
  const rawText = ensureTerminalPunctuation(listItemText(item));
  const links = typeof item === "string" ? undefined : item.links;
  const content = typeof item === "string" ? undefined : item.content;
  const nestedBlocks = typeof item === "string" ? [] : item.blocks || [];
  const topicMatch = rawText.match(/^(.{3,90}?):\s+(.+)$/u);
  const textNode = !topicMatch ? renderInlineLinkedText(rawText, links, content) : (
    <>
      <span className="step-assignment-list-topic">{renderInlineLinkedText(`${topicMatch[1]}:`, links, content)}</span>
      {" "}
      <span className="step-assignment-list-example">{renderInlineLinkedText(topicMatch[2], links)}</span>
    </>
  );

  return (
    <>
      {rawText && <span>{textNode}</span>}
      {nestedBlocks.length > 0 && (
        <div className="step-assignment-list-nested-blocks">
          {nestedBlocks.map((nested, index) => (
            <AssignmentBlockRenderer
              block={nested}
              answers={{}}
              readOnly
              key={`${blockId}-nested-${index}`}
              onAnswerChange={() => undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function AssignmentBlockRenderer({ block, answers, readOnly, validationError, onAnswerChange }: AssignmentBlockRendererProps) {
  if (block.type === "text") {
    if (block.style === "heading") {
      return <h2 className="step-assignment-heading">{stripHeadingTerminalPeriod(block.text)}</h2>;
    }

    const className = block.style === "lead" ? "step-assignment-lead" : "step-assignment-paragraph";
    return <p className={className}>{renderInlineLinkedText(ensureTerminalPunctuation(block.text), block.links, block.content)}</p>;
  }

  if (block.type === "quote") {
    return <blockquote className="step-assignment-quote">{renderInlineLinkedText(ensureTerminalPunctuation(block.text), undefined, block.content)}</blockquote>;
  }

  if (block.type === "list") {
    const isReadingRules = Boolean(block.title && isReadingRulesTitle(block.title));
    return (
      <section className={`step-assignment-list-panel${isReadingRules ? " reading-rules" : ""}`}>
        {block.title && <h3>{stripHeadingTerminalPeriod(block.title)}</h3>}
        {isReadingRules ? (
          <div className="step-reading-rule-grid">
            {block.items.map((item, index) => {
              const parts = readingRuleParts(ensureTerminalPunctuation(listItemText(item)));
              return (
                <div className="step-reading-rule" key={`${block.id}-${index}`}>
                  <strong>{parts.symbol}</strong>
                  {parts.sound && <span>{parts.sound}</span>}
                  {parts.example && <em>{parts.example}</em>}
                </div>
              );
            })}
          </div>
        ) : (
          block.ordered ? (
            <ol>
              {block.items.map((item, index) => <li key={`${block.id}-${index}`}>{renderListItem(item, `${block.id}-${index}`)}</li>)}
            </ol>
          ) : (
            <ul>
              {block.items.map((item, index) => <li key={`${block.id}-${index}`}>{renderListItem(item, `${block.id}-${index}`)}</li>)}
            </ul>
          )
        )}
      </section>
    );
  }

  if (block.type === "radio") {
    const firstStation = block.stations[0];
    if (!firstStation) return null;
    return (
      <section className="step-radio-block" aria-label={block.title || "Радио"}>
        {block.title && <strong>{ensureTerminalPunctuation(block.title)}</strong>}
        <div className="step-radio-stations">
          {block.stations.map((station, index) => (
            <a className={index === 0 ? "step-radio-station is-active" : "step-radio-station"} href={station.url} key={`${block.id}-${index}`} target="_blank" rel="noopener noreferrer">
              {station.label}
            </a>
          ))}
        </div>
        <audio controls preload="none" src={firstStation.url} />
      </section>
    );
  }

  if (block.type === "link") {
    const isDownload = Boolean(block.download && isDownloadHref(block.href));
    return (
      <p className={isDownload ? "step-assignment-link-row is-download" : "step-assignment-link-row"}>
        <a className={isDownload ? "step-assignment-download-button" : "step-assignment-link"} href={block.href} target="_blank" rel="noreferrer" download={isDownload || undefined}>
          {isDownload && <i className="fa fa-download" aria-hidden="true" />}
          <span>{block.text}</span>
        </a>
      </p>
    );
  }

  if (block.type === "knownWords") {
    return <KnownWordsBlock block={block} onChange={onAnswerChange} readOnly={readOnly} value={answers[block.name]} />;
  }

  if (block.type === "image") {
    return (
      <figure className="step-image-block">
        <img src={block.src} alt={block.alt || block.caption || ""} loading="lazy" />
        {block.caption && <figcaption>{ensureTerminalPunctuation(block.caption)}</figcaption>}
      </figure>
    );
  }

  if (block.type === "video") {
    return (
      <section className="step-video-block" aria-label="Видео задания">
        <iframe
          src={youtubeEmbedUrl(block.code)}
          title={block.title || `Видео задания ${block.code}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </section>
    );
  }

  if (block.type === "audio") {
    const mp3Url = mediaAudioUrl(block.code, "mp3");
    return (
      <div className="step-audio-block">
        {block.title && <strong>{ensureTerminalPunctuation(block.title)}</strong>}
        <audio controls preload="metadata">
          <source src={mp3Url} type="audio/mpeg" />
          <source src={mediaAudioUrl(block.code, "ogg")} type="audio/ogg" />
        </audio>
        <a className="step-assignment-download-button" href={mp3Url} download aria-label="Скачать аудио в формате MP3"><i className="fa fa-download" aria-hidden="true" /><span>Скачать MP3</span></a>
      </div>
    );
  }

  return (
    <AssignmentFieldRenderer
      block={block}
      onChange={onAnswerChange}
      readOnly={readOnly}
      validationError={validationError}
      value={answers[block.name]}
    />
  );
}
