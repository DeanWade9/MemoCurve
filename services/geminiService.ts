import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
// In a real prod environment, never expose keys in client code without a proxy. 
// Per instructions, we assume process.env.API_KEY is available.

const ai = new GoogleGenAI({ apiKey });

export const generateQuestionForContent = async (content: string, type: 'word' | 'phrase' = 'word'): Promise<string> => {
  if (!apiKey) {
    console.warn("Gemini API Key missing");
    return `Define: ${content}`; // Fallback
  }

  try {
    const prompt = `
      Generate a single, short, engaging flashcard question for the learning content: "${content}".
      
      Rules:
      1. If it's a single word, ask for its meaning or a synonym context.
      2. If it's a phrase, ask for its usage or definition.
      3. Do NOT reveal the content "${content}" in the question if possible (use placeholders like 'this word' or '___').
      4. Keep it under 20 words.
      5. Output ONLY the question text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Gemini generation error:", error);
    return `What does "${content}" mean?`; // Fallback on error
  }
};
