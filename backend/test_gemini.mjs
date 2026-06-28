import { GoogleGenAI } from "@google/genai";

async function test() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        console.log("Testing gemini-2.5-flash-image...");
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-image", // <-- Update this line
            contents: "a cat",
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });
        console.log("Success gemini-2.5-flash-image! Parts:", response.candidates?.[0]?.content?.parts?.length);
    } catch(e) {
        console.error("Error gemini-2.5-flash-image:", e);
    }
}
test();
