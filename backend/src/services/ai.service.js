import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { searchInternet } from "./internet.service.js";
import {
  classifyQuery,
  getCricketData,
  getCryptoData,
} from "./realtime.service.js";

// ─────────────────────────────────────────────
//  MODEL FACTORY
// ─────────────────────────────────────────────

const getModelInstance = (modelId) => {
  try {
    if (modelId.includes("gemini")) {
      // Pass the exact model ID — supports gemini-2.5-flash, gemini-2.5-flash-lite, etc.
      return new ChatGoogleGenerativeAI({
        model: modelId,
        apiKey: process.env.GOOGLE_API_KEY,
        maxOutputTokens: 2048,
      });
    } else if (modelId.includes("mistral")) {
      return new ChatMistralAI({
        model:
          modelId === "mistral-large"
            ? "mistral-large-latest"
            : "mistral-small-latest",
        apiKey: process.env.MISTRAL_API_KEY,
      });
    } else if (modelId.includes("gpt")) {
      return new ChatOpenAI({
        model: modelId,
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else if (modelId.includes("llama") || modelId.includes("groq")) {
      return new ChatGroq({
        model: modelId,
        apiKey: process.env.GROQ_API_KEY,
      });
    }
  } catch (e) {
    console.error(`Error initializing model ${modelId}:`, e.message);
  }

  // Default fallback
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY,
  });
};

// ─────────────────────────────────────────────
//  SYSTEM PROMPTS per query type
// ─────────────────────────────────────────────

function buildSystemPrompt(queryType, realtimeContext) {
  const baseIdentity = "You are COROS, a fast and accurate AI assistant.";

  if (realtimeContext) {
    return new SystemMessage(
      `${baseIdentity}

REALTIME DATA PROVIDED BELOW — use it to answer accurately.
Do NOT add information beyond what is in the data.
If something is unclear from the data, say so directly.
Format responses in a clean, readable style using markdown.

--- REALTIME DATA ---
${realtimeContext}
--- END OF DATA ---`
    );
  }

  switch (queryType) {
    case "CODING":
      return new SystemMessage(
        `${baseIdentity}
You are an expert software engineer.
Answer with precise, correct code and brief explanations.
Use markdown code blocks. Be concise.`
      );

    case "CASUAL":
      return new SystemMessage(
        `${baseIdentity}
Respond naturally and conversationally. Keep it brief and friendly.`
      );

    case "GENERAL":
    default:
      return new SystemMessage(
        `${baseIdentity}
Answer using your knowledge accurately and concisely.
Use markdown for structure when helpful.`
      );
  }
}

// ─────────────────────────────────────────────
//  MAIN GENERATE FUNCTION
// ─────────────────────────────────────────────

export async function generateMessage(messages, modelId = "gemini-2.5-flash", file = null) {
  try {
    const userQuery = messages[messages.length - 1]?.content || "";
    const queryType = classifyQuery(userQuery);

    console.log(`[COROS] Query type: ${queryType} | Query: "${userQuery.slice(0, 60)}"`);

    let realtimeContext = null;

    // ── Step 1: Route to appropriate data source ──────────────────────────
    if (queryType === "CRICKET") {
      // Try Cricbuzz API first
      realtimeContext = await getCricketData(userQuery);
      if (!realtimeContext) {
        // Fallback: Tavily web search
        console.log("[COROS] Cricket API failed, falling back to Tavily...");
        try {
          const result = await searchInternet(`cricket ${userQuery}`);
          realtimeContext = result.results
            .map((r) => `${r.title}\n${r.content}`)
            .join("\n\n");
        } catch {
          realtimeContext = null;
        }
      }
    } else if (queryType === "CRYPTO") {
      // Try CoinGecko API first
      realtimeContext = await getCryptoData(userQuery);
      if (!realtimeContext) {
        // Fallback: Tavily web search
        console.log("[COROS] Crypto API failed, falling back to Tavily...");
        try {
          const result = await searchInternet(`crypto price ${userQuery}`);
          realtimeContext = result.results
            .map((r) => `${r.title}\n${r.content}`)
            .join("\n\n");
        } catch {
          realtimeContext = null;
        }
      }
    } else if (queryType === "REALTIME") {
      // Web search for general realtime queries
      try {
        const result = await searchInternet(userQuery);
        realtimeContext = result.results
          .map((r) => `Title: ${r.title}\nContent: ${r.content}`)
          .join("\n\n");
      } catch {
        realtimeContext = null;
      }
    }
    // GENERAL, CODING, CASUAL → LLM directly, no search needed

    // ── Step 2: Build prompt & invoke model ───────────────────────────────
    const model = getModelInstance(modelId);
    const systemPrompt = buildSystemPrompt(queryType, realtimeContext);

    const finalMessages = [
      systemPrompt,
      ...messages.slice(0, -1).map((msg) => {
        if (msg.role === "user") return new HumanMessage(msg.content);
        return new AIMessage(msg.content);
      }),
    ];

    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      if (lastMsg.role === "user" && file && file.type === "image" && file.base64) {
        finalMessages.push(new HumanMessage({
          content: [
            { type: "text", text: lastMsg.content },
            { type: "image_url", image_url: { url: file.base64 } }
          ]
        }));
      } else {
        if (lastMsg.role === "user") {
          finalMessages.push(new HumanMessage(lastMsg.content));
        } else {
          finalMessages.push(new AIMessage(lastMsg.content));
        }
      }
    }

    const response = await model.invoke(finalMessages);
    return response.content;

  } catch (error) {
    console.error("[COROS] Primary model failed, attempting fallback...", error.message);

    // ── Fallback: Gemini Flash ─────────────────────────────────────────────
    try {
      const fallbackModel = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GOOGLE_API_KEY,
      });
      const chatMessages = messages.map((m) => new HumanMessage(m.content || ""));
      const fallbackResponse = await fallbackModel.invoke(chatMessages);
      return fallbackResponse.content;
    } catch (err) {
      console.error("[COROS] Universal AI failure:", err.message);
      return "This model is currently unavailable. Please try using Mistral or Gemini ✨";
    }
  }
}

// ─────────────────────────────────────────────
//  CHAT TITLE GENERATOR
// ─────────────────────────────────────────────

export async function generateChattitle(message) {
  try {
    const model = getModelInstance("mistral-small");
    const response = await model.invoke([
      new SystemMessage(
        "Summarize the following message in 2-4 words for a chat title. Return ONLY the title, no punctuation or quotes."
      ),
      new HumanMessage(message || "New Conversation"),
    ]);
    return response.content.toString().replace(/[\"']/g, "");
  } catch (err) {
    return "Untitled Exploration";
  }
}
