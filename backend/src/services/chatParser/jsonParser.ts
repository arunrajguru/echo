import type { ParsedMessage } from "./whatsappParser.js";

export function parseJsonChat(content: string): {
  messages: ParsedMessage[];
  participants: string[];
} {
  const data = JSON.parse(content);
  const messages: ParsedMessage[] = [];
  const participantsSet = new Set<string>();

  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data.messages)
    ? data.messages
    : Array.isArray(data.chats)
    ? data.chats
    : [];

  let rawIndex = 0;
  for (const item of list) {
    if (!item) continue;

    const sender =
      item.sender ||
      item.author ||
      item.from ||
      item.user ||
      item.name ||
      "Unknown";
    const text =
      item.text ||
      item.message ||
      item.content ||
      item.body ||
      "";

    if (!text.trim()) continue;

    const timestamp = item.timestamp
      ? new Date(item.timestamp)
      : item.date
      ? new Date(item.date)
      : new Date();

    participantsSet.add(sender);

    messages.push({
      sender,
      text: text.trim(),
      timestamp,
      rawIndex: rawIndex++,
    });
  }

  return {
    messages,
    participants: Array.from(participantsSet),
  };
}
