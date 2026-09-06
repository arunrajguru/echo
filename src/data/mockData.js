// Stands in for the RAG/persona backend until src/services/api.js is wired up.
// Nothing here should be treated as real data — see integration TODOs in
// each screen for exactly where each mock is meant to be replaced.

export const DEMO_PERSONAS = [
  {
    id: "demo_dad",
    name: "Dad",
    relationship: "Father",
    stats: {
      messagesAnalyzed: 2481,
      personaMessages: 1203,
      memoriesExtracted: 7,
      conversationExamples: 218,
      confidence: 0.91,
    },
    style: {
      tone: "Warm, caring, economical with words",
      humor: "Gentle one-liners, Hindi check-ins",
      emojis: ["😂", "👍", "🙏", "❤️"],
      signOff: "call me when you land",
    },
  },
  {
    id: "demo_rahul",
    name: "Rahul",
    relationship: "Best Friend",
    stats: {
      messagesAnalyzed: 3120,
      personaMessages: 1540,
      memoriesExtracted: 5,
      conversationExamples: 340,
      confidence: 0.93,
    },
    style: {
      tone: "Casual, energetic, Hinglish bro",
      humor: "Playful teasing, gaming/hackathon memories",
      emojis: ["😂", "🔥", "🏆"],
      signOff: "kal milte hain bro",
    },
  },
  {
    id: "demo_priya",
    name: "Priya",
    relationship: "Close Friend",
    stats: {
      messagesAnalyzed: 1890,
      personaMessages: 980,
      memoriesExtracted: 6,
      conversationExamples: 195,
      confidence: 0.92,
    },
    style: {
      tone: "Expressive, creative, enthusiastic",
      humor: "Art workshops, cheerful expressions",
      emojis: ["😊", "🎨", "❤️", "✨"],
      signOff: "sun na, talk soon!",
    },
  },
];

export const MOCK_PERSONA = DEMO_PERSONAS[0];

export const MOCK_MEMORIES = [
  {
    id: 1,
    title: "The Goa Trip",
    category: "Trips",
    confidence: 0.94,
    date: "2019",
    content:
      "The family trip to Goa — remembered mostly for the sudden rainstorm and someone ending up in the water.",
    sourceLines: [
      "Obviously 😂",
      "How can I forget that rain?",
      "You literally fell into the water bro 😂",
    ],
  },
  {
    id: 2,
    title: "Sunday Phone Calls",
    category: "Conversations",
    confidence: 0.88,
    date: "Recurring",
    content: "A standing habit of calling every Sunday evening, usually opening with the same question about the week.",
    sourceLines: ["So what broke this week?", "Call me when you land"],
  },
  {
    id: 3,
    title: "The Terrible Puns",
    category: "Favorites",
    confidence: 0.97,
    date: "Ongoing",
    content: "A running bit of unapologetically bad puns, usually delivered completely deadpan.",
    sourceLines: ["I'm reading a book on anti-gravity. It's impossible to put down."],
  },
  {
    id: 4,
    title: "The Old Fishing Boat",
    category: "Places",
    confidence: 0.81,
    date: "Childhood",
    content: "Early Saturday mornings on a small rented boat, mostly spent untangling lines rather than catching anything.",
    sourceLines: ["We didn't catch a single thing again lol"],
  },
  {
    id: 5,
    title: "Diwali at Grandma's",
    category: "People",
    confidence: 0.9,
    date: "Annual",
    content: "The whole family gathering at Grandma's every Diwali, an event mentioned fondly and often.",
    sourceLines: ["Same time as always, don't be late this year"],
  },
];
