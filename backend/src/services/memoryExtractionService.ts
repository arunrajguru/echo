import mongoose from "mongoose";
import { IConversationMessage } from "../models/ConversationMessage.js";

export interface ExtractedMemoryData {
  title: string;
  category: "Trips" | "Conversations" | "Favorites" | "Places" | "People" | "General";
  confidence: number;
  date: string;
  content: string;
  sourceLines: string[];
  sourceMessageIds: mongoose.Types.ObjectId[];
}

interface KeywordCategoryMap {
  keywords: string[];
  category: "Trips" | "Conversations" | "Favorites" | "Places" | "People" | "General";
  defaultPrefix: string;
}

const CATEGORY_KEYWORDS: KeywordCategoryMap[] = [
  {
    keywords: ["trip", "travel", "flight", "train", "hotel", "beach", "goa", "manali", "shimla", "paris", "vacation", "journey", "visited", "tour", "holiday", "camping", "rain", "island"],
    category: "Trips",
    defaultPrefix: "The Trip to",
  },
  {
    keywords: ["restaurant", "cafe", "garden", "lake", "river", "boat", "cabin", "house", "park", "office", "campus", "library", "hostel", "room", "terrace", "fishing"],
    category: "Places",
    defaultPrefix: "Moments at the",
  },
  {
    keywords: ["recipe", "biryani", "kheer", "food", "cook", "dish", "coffee", "tea", "chai", "book", "movie", "song", "joke", "pun", "game", "match", "music", "guitar", "anti-gravity", "gravity"],
    category: "Favorites",
    defaultPrefix: "Favorite",
  },
  {
    keywords: ["diwali", "eid", "christmas", "holi", "birthday", "anniversary", "wedding", "grandma", "mom", "dad", "sister", "brother", "friend", "cousin", "family", "gathering", "dinner"],
    category: "People",
    defaultPrefix: "Time with",
  },
  {
    keywords: ["hackathon", "exam", "college", "school", "project", "prize", "trophy", "win", "won", "interview", "job", "promotion", "graduation"],
    category: "Conversations",
    defaultPrefix: "Achievement &",
  },
];

/**
 * Extracts discrete memories from actual conversation messages.
 * Never injects hardcoded sample memories.
 */
export function extractMemoriesFromMessages(
  personaId: mongoose.Types.ObjectId,
  messages: IConversationMessage[]
): ExtractedMemoryData[] {
  if (!messages || messages.length === 0) return [];

  const extracted: ExtractedMemoryData[] = [];
  const processedMessageIds = new Set<string>();

  // 1. Scan for semantic clusters matching real keywords
  for (const catMap of CATEGORY_KEYWORDS) {
    const matchedMsgs: IConversationMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (processedMessageIds.has((msg._id as any).toString())) continue;
      if (
        msg.metadata?.messageType === "attachment" ||
        msg.text.includes("(file attached)") ||
        msg.text.includes("<Media omitted>") ||
        msg.text.match(/\.(jpg|jpeg|png|gif|mp4|wav|opus)$/i)
      ) {
        processedMessageIds.add((msg._id as any).toString());
        continue;
      }

      const lower = msg.text.toLowerCase();
      const hasKeyword = catMap.keywords.some((k) => lower.includes(k));

      if (hasKeyword) {
        matchedMsgs.push(msg);
        processedMessageIds.add((msg._id as any).toString());

        // Check if next message is a thread reply
        if (i < messages.length - 1) {
          const nextMsg = messages[i + 1];
          if (
            !nextMsg.metadata?.messageType ||
            nextMsg.metadata.messageType !== "attachment"
          ) {
            const nextLower = nextMsg.text.toLowerCase();
            const hasOtherCat = CATEGORY_KEYWORDS.some(
              (other) => other !== catMap && other.keywords.some((k) => nextLower.includes(k))
            );
            if (!hasOtherCat && !processedMessageIds.has((nextMsg._id as any).toString())) {
              matchedMsgs.push(nextMsg);
              processedMessageIds.add((nextMsg._id as any).toString());
            }
          }
        }
      }
    }

    if (matchedMsgs.length > 0) {
      const representativeMsgs = matchedMsgs.slice(0, 5);
      const sourceLines = representativeMsgs.map((m) => m.text);
      const sourceMessageIds = representativeMsgs.map((m) => m._id as mongoose.Types.ObjectId);

      // Extract dynamic topic title from the matched text
      const firstMsgText = sourceLines[0];
      const matchedKeyword = catMap.keywords.find((k) => firstMsgText.toLowerCase().includes(k)) || catMap.category;
      const capitalizedKeyword = matchedKeyword.charAt(0).toUpperCase() + matchedKeyword.slice(1);

      let title = "";
      if (catMap.category === "Trips") {
        title = `The ${capitalizedKeyword} Trip`;
      } else if (catMap.category === "Places") {
        title = `The ${capitalizedKeyword}`;
      } else if (catMap.category === "Favorites") {
        title = `${capitalizedKeyword} Discussions`;
      } else if (catMap.category === "People") {
        title = `${capitalizedKeyword} Gatherings`;
      } else {
        title = `${capitalizedKeyword} Experience`;
      }

      // Format date if available from message timestamps
      const dates = representativeMsgs.map((m) => new Date(m.timestamp)).filter((d) => !isNaN(d.getTime()));
      const dateStr = dates.length > 0 ? dates[0].getFullYear().toString() : "Shared Past";

      // Summary from the actual conversation
      const summary = `Shared conversation regarding ${matchedKeyword}: "${firstMsgText.slice(0, 100)}${firstMsgText.length > 100 ? "..." : ""}"`;

      const confidence = Math.min(0.97, Math.max(0.82, 0.80 + matchedMsgs.length * 0.04));

      extracted.push({
        title,
        category: catMap.category,
        confidence: Math.round(confidence * 100) / 100,
        date: dateStr,
        content: summary,
        sourceLines,
        sourceMessageIds,
      });
    }
  }

  // 2. Extract remaining distinct conversation threads (chunks of 3-4 consecutive messages)
  const remainingMsgs = messages.filter(
    (m) =>
      !processedMessageIds.has((m._id as any).toString()) &&
      m.text.trim().length > 10 &&
      m.metadata?.messageType !== "attachment" &&
      !m.text.includes("(file attached)") &&
      !m.text.includes("<Media omitted>")
  );

  if (remainingMsgs.length >= 2 && extracted.length < 5) {
    const chunkSize = Math.min(4, Math.max(2, Math.floor(remainingMsgs.length / 2)));
    for (let i = 0; i < remainingMsgs.length && extracted.length < 6; i += chunkSize) {
      const chunk = remainingMsgs.slice(i, i + chunkSize);
      const sourceLines = chunk.map((m) => m.text);
      const sourceMessageIds = chunk.map((m) => m._id as mongoose.Types.ObjectId);
      const sampleText = chunk[0].text;

      // Extract key phrase for title
      const cleanWords = sampleText.replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3);
      const topicKeyword = cleanWords.length > 0 ? cleanWords[0] : "Discussion";
      const capTopic = topicKeyword.charAt(0).toUpperCase() + topicKeyword.slice(1);

      extracted.push({
        title: `${capTopic} Conversation`,
        category: "Conversations",
        confidence: 0.85,
        date: "Past",
        content: `Memorable conversation: "${sampleText.slice(0, 90)}${sampleText.length > 90 ? "..." : ""}"`,
        sourceLines,
        sourceMessageIds,
      });
    }
  }

  return extracted;
}
