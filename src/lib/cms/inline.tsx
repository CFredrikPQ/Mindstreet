import type { ReactNode } from "react";

const pattern =
  /(\+\+([^+\n]+)\+\+)|(\*\*((?:[^*\n]|\*(?!\*))+)\*\*)|((?<!\*)\*(?!\*)([^*\n]+)\*(?!\*))|(\[([^\]\n]+)\]\(([^)\s]+)\))|(https?:\/\/[^\s)]+)/g;

export function safeHref(href: string): string | null {
  const value = href.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^(mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  return null;
}

export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(pattern);
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2]) {
      nodes.push(<u key={key++}>{renderInline(match[2])}</u>);
    } else if (match[4]) {
      nodes.push(<strong key={key++}>{renderInline(match[4])}</strong>);
    } else if (match[6]) {
      nodes.push(<em key={key++}>{renderInline(match[6])}</em>);
    } else if (match[8] && match[9]) {
      const href = safeHref(match[9]);
      nodes.push(
        href ? (
          <a key={key++} href={href}>
            {renderInline(match[8])}
          </a>
        ) : (
          match[0]
        ),
      );
    } else if (match[10]) {
      nodes.push(
        <a key={key++} href={match[10]}>
          {match[10]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export type LineFormat = "bullet" | "number" | "heading";
export type TextStyle = "normal" | "heading";

export type SelectionFormat = {
  style: TextStyle;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bullet: boolean;
  number: boolean;
};

const lineMarker = /^(?:-\s+|\d+\.\s+|#\s+)/;

function lineMarkerKind(line: string): LineFormat | null {
  if (/^-\s+/.test(line)) return "bullet";
  if (/^\d+\.\s+/.test(line)) return "number";
  if (/^#\s+/.test(line)) return "heading";
  return null;
}

function lineBounds(value: string, start: number, end: number) {
  const from = Math.max(0, Math.min(Math.min(start, end), value.length));
  const to = Math.max(0, Math.min(Math.max(start, end), value.length));
  const lineStart = value.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
  let exclusive = to;
  if (exclusive > from && value[exclusive - 1] === "\n") exclusive -= 1;
  const lineBreak = value.indexOf("\n", exclusive);
  const lineEnd = lineBreak === -1 ? value.length : lineBreak;
  return { from, to, lineStart, lineEnd };
}

function replaceLines(
  value: string,
  start: number,
  end: number,
  mapLine: (line: string) => string,
) {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const insert = value.slice(lineStart, lineEnd).split("\n").map(mapLine).join("\n");
  return {
    value: value.slice(0, lineStart) + insert + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + insert.length,
  };
}

function unwrapInline(text: string) {
  let current = text;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = current
      .replace(/\+\+([^+\n]+)\+\+/g, "$1")
      .replace(/\*\*((?:[^*\n]|\*(?!\*))+)\*\*/g, "$1")
      .replace(/(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1")
      .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, "$1");
    if (next === current) return current;
    current = next;
  }
  return current;
}

export function applyLineFormat(
  value: string,
  start: number,
  end: number,
  kind: LineFormat,
): { value: string; start: number; end: number } {
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const active = lines.filter((line) => line.trim());
  const remove = active.length > 0 && active.every((line) => lineMarkerKind(line.trim()) === kind);
  let number = 1;
  const nextLines = lines.map((line) => {
    if (!line.trim()) return line;
    const text = line.trim().replace(lineMarker, "");
    if (remove) return text;
    if (kind === "bullet") return `- ${text}`;
    if (kind === "heading") return `# ${text}`;
    return `${number++}. ${text}`;
  });
  const insert = nextLines.join("\n");
  return {
    value: value.slice(0, lineStart) + insert + value.slice(lineEnd),
    start: lineStart,
    end: lineStart + insert.length,
  };
}

export function applyTextStyle(
  value: string,
  start: number,
  end: number,
  style: TextStyle,
): { value: string; start: number; end: number } {
  return replaceLines(value, start, end, (line) => {
    if (!line.trim()) return line;
    const kind = lineMarkerKind(line.trim());
    if (style === "heading") return `# ${line.trim().replace(lineMarker, "")}`;
    if (kind === "heading") return line.trim().replace(lineMarker, "");
    return line;
  });
}

export function clearFormatting(
  value: string,
  start: number,
  end: number,
): { value: string; start: number; end: number } {
  return replaceLines(value, start, end, (line) => {
    if (!line.trim()) return line;
    const kind = lineMarkerKind(line.trim());
    const body = kind ? line.trim().replace(lineMarker, "") : line;
    return unwrapInline(body);
  });
}

const boldMark = /\*\*((?:[^*\n]|\*(?!\*))+)\*\*/;
const italicMark = /(?<!\*)\*(?!\*)([^*\n]+)\*(?!\*)/;
const underlineMark = /\+\+([^+\n]+)\+\+/;

function markSpans(value: string, marks: RegExp) {
  const spans: Array<[number, number]> = [];
  const re = new RegExp(marks.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) {
    spans.push([match.index, match.index + match[0].length]);
  }
  return spans;
}

function selectionHasMark(value: string, from: number, to: number, marks: RegExp) {
  const spans = markSpans(value, marks);
  if (from === to) return spans.some(([start, end]) => from > start && from < end);
  let sawText = false;
  for (let index = from; index < to; index += 1) {
    if (/\s/.test(value[index] ?? "")) continue;
    sawText = true;
    if (!spans.some(([start, end]) => index >= start && index < end)) return false;
  }
  return sawText;
}

export function inspectFormat(value: string, start: number, end: number): SelectionFormat {
  const { from, to, lineStart, lineEnd } = lineBounds(value, start, end);
  const active = value
    .slice(lineStart, lineEnd)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const every = (kind: LineFormat) => active.length > 0 && active.every((line) => lineMarkerKind(line) === kind);
  return {
    style: every("heading") ? "heading" : "normal",
    bold: selectionHasMark(value, from, to, boldMark),
    italic: selectionHasMark(value, from, to, italicMark),
    underline: selectionHasMark(value, from, to, underlineMark),
    bullet: every("bullet"),
    number: every("number"),
  };
}

export function applyInline(
  value: string,
  start: number,
  end: number,
  kind: "bold" | "italic" | "underline" | "link",
  url?: string,
): { value: string; start: number; end: number } | null {
  const selected = value.slice(start, end);
  if (kind === "bold" || kind === "italic" || kind === "underline") {
    const inner = selected || "text";
    const open = kind === "bold" ? "**" : kind === "italic" ? "*" : "++";
    const insert = `${open}${inner}${open}`;
    return {
      value: value.slice(0, start) + insert + value.slice(end),
      start: start + open.length,
      end: start + open.length + inner.length,
    };
  }

  const href = safeHref(url ?? "");
  if (!href) return null;
  const label = selected || href;
  const insert = `[${label}](${href})`;
  const labelStart = start + 1;
  return {
    value: value.slice(0, start) + insert + value.slice(end),
    start: labelStart,
    end: labelStart + label.length,
  };
}
