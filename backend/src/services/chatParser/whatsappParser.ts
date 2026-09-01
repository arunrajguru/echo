export interface ParsedMessage {
  sender: string;
  text: string;
  timestamp: Date;
  rawIndex: number;
  messageType?: "text" | "attachment" | "system";
  attachmentFilename?: string;
}

const ATTACHMENT_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "mp4", "mov", "opus", "m4a", "mp3", "wav", "pdf", "doc", "docx", "xls", "xlsx", "zip"];

export function parseWhatsAppChat(content: string): {
  messages: ParsedMessage[];
  participants: string[];
} {
  const lines = content.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  const participantsSet = new Set<string>();

  // Format 1: [15/01/24, 14:32:10] Sender: Message or [1/15/24, 2:32:10 PM] Sender: Message
  const bracketRegex = /^\[(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+?):\s+(.*)$/;
  // Format 2: 15/01/2024, 14:32 - Sender: Message or 1/15/24, 2:32 PM - Sender: Message
  const dashRegex = /^(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+([^:]+?):\s+(.*)$/;

  let currentMessage: ParsedMessage | null = null;
  let rawIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check system messages to skip
    if (
      line.includes("Messages and calls are end-to-end encrypted") ||
      line.includes("created group") ||
      line.includes("added you") ||
      line.includes("You were added") ||
      line.includes("changed the group") ||
      line.includes("changed the subject") ||
      line.includes("security code changed") ||
      line.includes("Missed voice call") ||
      line.includes("Missed video call") ||
      line.includes("This chat is with a business account") ||
      line.includes("Waiting for this message") ||
      line.includes("Contact card omitted") ||
      line.includes("location:")
    ) {
      continue;
    }

    let match = line.match(bracketRegex);
    if (!match) {
      match = line.match(dashRegex);
    }

    if (match) {
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, datePart, timePart, senderRaw, textRaw] = match;
      const sender = senderRaw.trim();
      const text = textRaw.trim();

      // Skip deleted messages
      if (
        text === "This message was deleted" ||
        text === "You deleted this message"
      ) {
        currentMessage = null;
        continue;
      }

      // Check if message is an attachment, media, or URL link
      let messageType: "text" | "attachment" | "system" = "text";
      let attachmentFilename: string | undefined = undefined;

      const isMediaOmitted =
        text === "<Media omitted>" ||
        text === "image omitted" ||
        text === "video omitted" ||
        text === "sticker omitted" ||
        text === "audio omitted" ||
        text === "document omitted" ||
        text === "GIF omitted";

      const fileAttachedMatch = text.match(
        /^([\w\.-]+\.([a-zA-Z0-9]+))\s*(?:\(file attached\)|\<attached:[^\>]+\>)?$/i
      );
      const isFileNameAttachment =
        fileAttachedMatch && ATTACHMENT_EXTENSIONS.includes(fileAttachedMatch[2].toLowerCase());

      const isMediaPrefix = /^(IMG|VID|PTT|AUD|DOC|STK|WA)-\d+.*(\.|\s|$)/i.test(text);

      const isUrlOnly = /^(https?:\/\/[^\s]+|\/\/[^\s]+|www\.[^\s]+|chatgpt\.com\/share\/[^\s]+|wa\.me\/[^\s]+)$/i.test(
        text
      );

      if (
        isMediaOmitted ||
        isFileNameAttachment ||
        isMediaPrefix ||
        text.includes("(file attached)") ||
        isUrlOnly
      ) {
        messageType = "attachment";
        if (fileAttachedMatch) {
          attachmentFilename = fileAttachedMatch[1];
        }
      }

      // Parse timestamp
      let parsedDate = new Date();
      try {
        const parts = datePart.split(/[\/\.-]/);
        if (parts.length === 3) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10) - 1;
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          if (day > 12 && month <= 12) {
            parsedDate = new Date(year, month, day);
          } else {
            parsedDate = new Date(year, month, day);
          }
        }
      } catch {
        parsedDate = new Date();
      }

      participantsSet.add(sender);

      currentMessage = {
        sender,
        text,
        timestamp: parsedDate,
        rawIndex: rawIndex++,
        messageType,
        attachmentFilename,
      };
    } else if (currentMessage) {
      // Continuation of previous multiline message
      currentMessage.text += "\n" + line;
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return {
    messages,
    participants: Array.from(participantsSet),
  };
}
