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
