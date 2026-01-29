
import { GoogleGenAI, Type } from "@google/genai";
import { StyleFidelity, RefMetadata, AspectRatio } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

/**
 * PHASE 1: Visual Prompt Decoder (Reverse-Engineering)
 * Extracts the "Invisible Prompt" including complex composition and occlusions.
 */
export const decodeReferenceImage = async (referenceBase64: string): Promise<RefMetadata> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { data: referenceBase64, mimeType: 'image/png' } },
        { text: `ACT AS A PROMPT ENGINEER. Analyze this image to create a REVERSE-ENGINEERED prompt.
                 Provide a structured JSON response with these keys:
                 - artStyle: The exact medium (e.g., Ufotable 2D anime, Hyper-realistic 3D Unreal Engine render).
                 - outfitDetails: Comprehensive clothing description.
                 - poseAndGestures: Body posture and specific hand gestures.
                 - backgroundElements: Environment and atmosphere.
                 - lightingAndColor: Palette and light source.
                 - composition: Describe framing AND any foreground occlusions (e.g., 'hands clasped over mouth', 'sword blade across eyes', 'magical energy obscuring jawline'). This is CRITICAL for reconstruction.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          artStyle: { type: Type.STRING },
          outfitDetails: { type: Type.STRING },
          poseAndGestures: { type: Type.STRING },
          backgroundElements: { type: Type.STRING },
          lightingAndColor: { type: Type.STRING },
          composition: { type: Type.STRING }
        },
        required: ["artStyle", "outfitDetails", "poseAndGestures", "backgroundElements", "lightingAndColor", "composition"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as RefMetadata;
};

/**
 * PHASE 2: Re-Render Engine 2.0 (Identity vs Style Fix)
 * Generates a completely fresh image using metadata + user subject.
 */
export const mimicStyle = async (
  referenceBase64: string,
  userBase64: string,
  metadata: RefMetadata,
  fidelity: StyleFidelity,
  aspectRatio: AspectRatio
): Promise<string> => {
  const ai = getAIClient();
  
  const isStylized = /anime|2d|illustration|cartoon|drawing|sketch/i.test(metadata.artStyle);

  const fidelityMode = fidelity === StyleFidelity.HARD 
    ? (isStylized 
        ? `TRANSLATE THE USER TO THE STYLE: Do not paste a photo. Draw the user as if they are a character in this specific style (${metadata.artStyle}). Flatten the skin shading, enlarge eyes slightly if the style demands it, but keep the user's likeness through facial structure.`
        : `FULL TRANSFORMATION: The subject MUST be fully converted into the medium of '${metadata.artStyle}'. Render the subject using the specific textures, skin shaders, and lighting models of that medium.`)
    : `REALISTIC ADAPTATION: Keep the subject looking like a real human, but apply cinematic lighting, props, and environment of the reference. The result should look like a high-budget live-action adaptation of the style.`;

  const prompt = `
TASK: Generate a cohesive image merging the STYLE of Image 1 with the IDENTITY of Image 2.

[IDENTITY PRESERVATION BLOCK]
IDENTITY PRIORITY: You must preserve the User's (Image 2) facial structure, eye shape, nose shape, and ethnicity. However, you MUST render these features using the Art Style of Image 1.

[IMAGE 1 - THE BLUEPRINT]
This image dictates the Art Style, Pose, Composition, Lighting, and Background.
- Style Description: ${metadata.artStyle}
- Required Pose: ${metadata.poseAndGestures}
- Reference Composition Authority: The Reference Image (Image 1) dictates the scene. If Image 1 has hands covering the face (e.g., Sukuna/Megumi signs), you MUST draw the User performing that exact hand sign. The hands must cover the user's face exactly as they do in the reference.

[IMAGE 2 - THE ACTOR]
This image dictates the Facial Features and Identity.
- Identity Instructions: Transfer the user's eye shape, nose, mouth, and jawline.
- CRITICAL: Do NOT simply paste Image 2 onto Image 1.
- STYLIZATION: You must paint/render the face of Image 2 to match the specific texture and shading of Image 1.
  - If Image 1 is Anime -> Draw Image 2 as an anime character.
  - If Image 1 is 3D Render -> Render Image 2 with 3D skin textures.
  - If Image 1 is Photoreal -> Keep Image 2 photorealistic but match the lighting.

OUTPUT GOAL: A seamless, single image. No cropping. The result should look like the person in Image 2 is cosplaying or starring in the world of Image 1.

${fidelityMode}
`;

  const validRatio = aspectRatio === 'AUTO' ? '1:1' : aspectRatio;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: referenceBase64, mimeType: 'image/png' } },
        { inlineData: { data: userBase64, mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: validRatio as any
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Re-rendering engine failed to produce image.");
};

export const editGeneratedImage = async (
  currentImageBase64: string,
  editPrompt: string
): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: currentImageBase64, mimeType: 'image/png' } },
        { text: editPrompt }
      ]
    }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to edit image");
};
