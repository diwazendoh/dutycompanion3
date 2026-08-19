
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getSmartNursingRecommendations(diagnosis: string) {
  if (!diagnosis || diagnosis.length < 3) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3-5 standard nursing tasks and monitoring precautions for a patient with the following diagnosis: "${diagnosis}". Provide the response as a JSON object.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable nursing tasks."
            },
            precautions: {
              type: Type.STRING,
              description: "Key safety precautions."
            }
          },
          required: ["suggestedTasks", "precautions"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}
