import { GoogleGenAI, Type, Modality } from "@google/genai";
import { HistoricalEvent } from "../types";

const eventSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'The name of the historical era or concept.',
        },
        prompt: {
          type: Type.STRING,
          description: 'A descriptive prompt for generating an image in this era.',
        },
      },
      required: ["title", "prompt"],
    },
};

export async function generateHistoricalEvents(apiKey: string): Promise<HistoricalEvent[]> {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: "Generate a JSON array of 7 major, visually distinct historical events suitable for an immersive art project. Each object should have a 'title' (e.g., 'Ancient Rome') and a 'prompt' (e.g., 'A bustling street scene in Ancient Rome with grand architecture like the Colosseum in the background.'). Focus on eras with iconic aesthetics.",
      config: {
        responseMimeType: "application/json",
        responseSchema: eventSchema,
      },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error generating historical events:", error);
    // Provide a fallback list and rethrow the original error to be handled by the UI
    if (error instanceof Error && error.message.includes('400')) {
        throw error;
    }
    return [
        { title: 'Ancient Egypt', prompt: 'Inside a grand pyramid, with hieroglyphics on the walls and golden artifacts.' },
        { title: 'Viking Age', prompt: 'On a Viking longship sailing through a misty fjord, with rugged mountains in the distance.' },
        { title: 'Feudal Japan', prompt: 'A serene Japanese garden with cherry blossoms, a pagoda, and samurai in the distance.' },
        { title: 'The Renaissance', prompt: 'A bustling Florentine market square during the Renaissance, with artists and scholars.' },
        { title: 'Wild West', prompt: 'A dusty main street of a Wild West town with saloons, cowboys, and horses.' },
        { title: 'Roaring Twenties', prompt: 'A lavish Art Deco party from the Roaring Twenties, with flapper dresses and a jazz band.' },
        { title: 'Cyberpunk Future', prompt: 'A neon-lit street in a futuristic cyberpunk city with flying vehicles and towering skyscrapers.' }
    ];
  }
}

export async function generateExpansionEvents(apiKey: string, baseEvent: HistoricalEvent): Promise<HistoricalEvent[]> {
    const ai = new GoogleGenAI({ apiKey });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: `Based on the historical event "${baseEvent.title}", generate a JSON array of 3 related, but more specific, visually distinct sub-events or concepts. For example, if the event is 'Ancient Rome', you could suggest 'The Colosseum', 'Roman Aqueducts', or 'A Senatorial Debate'. Each object must have a 'title' and a 'prompt'.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: eventSchema,
        },
      });
  
      const jsonString = response.text.trim();
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error generating expansion events:", error);
      if (error instanceof Error && error.message.includes('400')) {
        throw error;
      }
      return [];
    }
}

export async function generateDynamicScenePrompt(apiKey: string, basePrompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `You are a master art director and prompt engineer for a generative AI model. Your task is to take a simple concept and create a prompt for an image of a person taking a selfie in that historical setting.

            Base Concept: "${basePrompt}"

            Generate a new, detailed prompt that describes a scene from a selfie-taker's perspective. The prompt must include:
            - **Composition:** Explicitly state this is a "selfie photo," "first-person perspective," or "point-of-view shot." The main subject is in the foreground, slightly off-center, as if holding the camera.
            - **Background Scene:** A vivid and detailed description of the historical environment, action, and mood behind the person.
            - **Artistic Style:** Specify a compelling, photorealistic style (e.g., hyperrealistic, cinematic photo, shot on film).
            - **Lighting:** Detail the lighting conditions that affect both the person in the foreground and the background (e.g., bright midday sun, golden hour sunset, flickering torchlight).
            - **Atmosphere:** Describe the overall mood (e.g., bustling and chaotic, serene and majestic, adventurous and exciting).
            - **Specific Details:** Add at least three specific, interesting details to the background scene to make it unique and immersive.

            The final output should be ONLY the new, detailed prompt as a single string, ready to be used for image generation. Do not include any other text or explanation.`,
            config: {
                temperature: 0.9,
            }
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating dynamic prompt:", error);
        if (error instanceof Error && error.message.includes('400')) {
            throw error;
        }
        return basePrompt;
    }
}


export async function generateImmersiveImage(
  apiKey: string,
  userImage: { base64: string; mimeType: string },
  dynamicEventPrompt: string
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    const imagePart = {
      inlineData: {
        data: userImage.base64,
        mimeType: userImage.mimeType,
      },
    };

    const textPart = {
      text: `Your primary task is to create a photorealistic selfie of the person from the user image, as if they have traveled back in time.

      **Scene & Style Description (from the selfie-taker's perspective):**
      ${dynamicEventPrompt}

      **Integration Instructions:**
      1.  **Composition:** The person from the user image is the main subject in the foreground, taking a selfie. Their pose should be natural for someone holding a camera or device just out of frame.
      2.  **Transformation:** Transform the person to look like they truly belong in the historical era described. This includes:
          - **Clothing:** Change their clothes to be completely period-appropriate.
          - **Appearance:** Adapt their hairstyle and add subtle, era-specific details (e.g., slight weathering on skin for an ancient setting, different grooming style) to enhance realism.
      3.  **Likeness:** It is absolutely crucial to maintain the person's core facial features and likeness. Do not change their face.
      4.  **Seamless Blending:** Flawlessly match the person to the background's lighting, shadows, color grading, and overall artistic style to create a single, cohesive image. The final result should look like a genuine photograph, not a composite.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("No image was generated.");
}