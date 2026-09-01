import type { ParsedMessage } from "./whatsappParser.js";

export function parseCsvChat(content: string): {
  messages: ParsedMessage[];
  participants: string[];
} {
  const lines = content.split(/\r?\n/);
  if (lines.length < 2) {
    return { messages: [], participants: [] };
  }

  // Parse header
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  let senderCol = header.findIndex((h) =>
    ["sender", "author", "from", "user", "name"].includes(h)
  );
  let textCol = header.findIndex((h) =>
    ["text", "message", "content", "body"].includes(h)
  );
  let timeCol = header.findIndex((h) =>
    ["timestamp", "time", "date", "datetime"].includes(h)
  );

  if (senderCol === -1) senderCol = 0;
  if (textCol === -1) textCol = 1;

  const messages: ParsedMessage[] = [];
  const participantsSet = new Set<string>();
  let rawIndex = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const row = parseCsvLine(rawLine);
    const sender = (row[senderCol] || "Unknown").trim();
    const text = (row[textCol] || "").trim();
    if (!text) continue;

    let timestamp = new Date();
    if (timeCol !== -1 && row[timeCol]) {
      const parsed = new Date(row[timeCol]);
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed;
      }
    }

    participantsSet.add(sender);

    messages.push({
      sender,
      text,
      timestamp,
      rawIndex: rawIndex++,
    });
  }

  return {
    messages,
    participants: Array.from(participantsSet),
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
