import AdmZip from "adm-zip";
import fs from "fs";
import { parseWhatsAppChat, type ParsedMessage } from "./whatsappParser.js";
import { parseJsonChat } from "./jsonParser.js";
import { parseCsvChat } from "./csvParser.js";

export type { ParsedMessage };

export interface ParseResult {
  messages: ParsedMessage[];
  participants: string[];
  format: "whatsapp" | "json" | "csv" | "text" | "whatsapp_zip";
  extractedFileName?: string;
  totalFilesExtracted?: number;
}

export function parseChatFile(
  contentOrBuffer: string | Buffer,
  fileName: string
): ParseResult {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // 1. Handle ZIP archives (e.g. WhatsApp export ZIP)
  if (ext === "zip" || (Buffer.isBuffer(contentOrBuffer) && contentOrBuffer.length > 4 && contentOrBuffer[0] === 0x50 && contentOrBuffer[1] === 0x4b)) {
    try {
      const buffer = Buffer.isBuffer(contentOrBuffer)
        ? contentOrBuffer
        : Buffer.from(contentOrBuffer, "binary");
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      console.log(`[parser] ZIP archive uploaded: ${fileName} contains ${zipEntries.length} entries`);

      // Find the main chat txt file in the ZIP (usually '_chat.txt' or 'WhatsApp Chat with <Name>.txt' or '*.txt')
      let chatEntry = zipEntries.find(
        (e) => !e.isDirectory && (e.entryName.toLowerCase().endsWith(".txt") || e.entryName.includes("chat"))
      );

      // If not found, try JSON or CSV
      if (!chatEntry) {
        chatEntry = zipEntries.find(
          (e) => !e.isDirectory && (e.entryName.toLowerCase().endsWith(".json") || e.entryName.toLowerCase().endsWith(".csv"))
        );
      }

      if (chatEntry) {
        const textContent = chatEntry.getData().toString("utf-8");
        const entryName = chatEntry.entryName;
        console.log(`[parser] Selected conversation file from ZIP: ${entryName}`);

        const result = parseChatContent(textContent, entryName);
        console.log(`[parser] Extracted from ZIP: ${result.messages.length} messages, participants: ${result.participants.join(", ")}`);

        return {
          ...result,
          format: "whatsapp_zip",
          extractedFileName: entryName,
          totalFilesExtracted: zipEntries.length,
        };
      }
    } catch (err) {
      console.error("[parser] Error processing ZIP archive:", err);
    }
  }

  // 2. Handle direct text / json / csv content
  const content = Buffer.isBuffer(contentOrBuffer)
    ? contentOrBuffer.toString("utf-8")
    : contentOrBuffer;

  return parseChatContent(content, fileName);
}

function parseChatContent(content: string, fileName: string): ParseResult {
  const ext = fileName.split(".").pop()?.toLowerCase();

  // Try JSON first if extension is .json or content starts with [ or {
  if (ext === "json" || content.trim().startsWith("[") || content.trim().startsWith("{")) {
    try {
      const parsed = parseJsonChat(content);
      if (parsed.messages.length > 0) {
        return { ...parsed, format: "json", extractedFileName: fileName };
      }
    } catch {
      // Fall through to whatsapp/text
    }
  }

  // Try CSV if extension is .csv
  if (ext === "csv") {
    try {
      const parsed = parseCsvChat(content);
      if (parsed.messages.length > 0) {
        return { ...parsed, format: "csv", extractedFileName: fileName };
      }
    } catch {
      // Fall through
    }
  }

  // Try WhatsApp parser
  const whatsappParsed = parseWhatsAppChat(content);
  if (whatsappParsed.messages.length > 0) {
    return { ...whatsappParsed, format: "whatsapp", extractedFileName: fileName };
  }

  // Fallback: line by line plain text
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const messages: ParsedMessage[] = lines.map((text, rawIndex) => ({
    sender: "Participant",
    text,
    timestamp: new Date(),
    rawIndex,
  }));

  return {
    messages,
    participants: ["Participant"],
    format: "text",
    extractedFileName: fileName,
  };
}
