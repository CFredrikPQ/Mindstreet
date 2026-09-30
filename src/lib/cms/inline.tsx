import type { ReactNode } from "react";

const pattern =
  /(\*\*([^*\n]+)\*\*)|(\[([^\]\n]+)\]\(([^)\s]+)\))|(https?:\/\/[^\s)]+)/g;

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
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4] && match[5]) {
      const href = safeHref(match[5]);
      nodes.push(
        href ? (
          <a key={key++} href={href}>
            {match[4]}
          </a>
        ) : (
          match[0]
        ),
      );
    } else if (match[6]) {
      nodes.push(
        <a key={key++} href={match[6]}>
          {match[6]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export type LineFormat = "bullet" | "number" | "heading";

const lineMarker = /^(?:-\s+|\d+\.\s+|#\s+)/;

function lineMarkerKind(line: string): LineFormat | null {
  if (/^-\s+/.test(line)) return "bullet";
  if (/^\d+\.\s+/.test(line)) return "number";
  if (/^#\s+/.test(line)) return "heading";
  return null;
}

export function applyLineFormat(
  value: string,
  start: number,
  end: number,
  kind: LineFormat,
): { value: string; start: number; end: number } {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  const lineStart = value.lastIndexOf("\n", Math.max(0, from - 1)) + 1;
  let exclusive = to;
  if (exclusive > from && value[exclusive - 1] === "\n") exclusive -= 1;
  const lineBreak = value.indexOf("\n", exclusive);
  const lineEnd = lineBreak === -1 ? value.length : lineBreak;
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

export function applyInline(
  value: string,
  start: number,
  end: number,
  kind: "bold" | "link",
  url?: string,
): { value: string; start: number; end: number } | null {
  const selected = value.slice(start, end);
  if (kind === "bold") {
    const inner = selected || "text";
    const insert = `**${inner}**`;
    return {
      value: value.slice(0, start) + insert + value.slice(end),
      start: start + 2,
      end: start + 2 + inner.length,
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
