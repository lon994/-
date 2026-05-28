import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set maximum body payload to support base64 images
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Shared server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // AI Generation API Endpoint
  app.post("/api/generate-eyes", async (req, res) => {
    try {
      const { prompt, imageBase64, imageMimeType, customModel, customEndpoint, customApiKey } = req.body;

      // Build system prompt for structured, creative styling of interactive eyes
      const systemInstruction = `
You are an expert industrial toy designer, visual designer, and embedded systems animation engineer specialized in creating dynamic animated eyes for electronic plush toys, wearable smart screens, and micro-display robotic companions.

Your task is to analyze the user's text prompt describing the look, role, or attitude of their custom plush toy, OR analyze their uploaded reference image. You will then generate a highly coordinated and gorgeous color palette, visual theme, and mechanical configuration for the interactive eyeball system.

Output your design as a rigid JSON structure conforming EXACTLY to the following schema. Speak in a friendly, professional, designer-focused Chinese or English voice.

The output MUST be valid JSON format matching this structure:
{
  "toyName": "The aesthetic name of the toy style (e.g. Dreamy Stardust Kitty, Stealth Robotic Owl, Vintage Mint Bunny)",
  "animalType": "The animal/object species class (e.g. Cat, Rabbit, Bear, Frog, Owl, Alien, Robot, Dragon)",
  "pupilColor": "A premium dominant eyeball color (hex, e.g. '#2D1B4E', must have excellent contrast against highlights)",
  "irisColor": "A gorgeous co-ordinated inner glow or eye ring accent color (hex, e.g. '#FF7BBF' or '#00FFCC')",
  "blushColor": "An expressive warm cheek cheek-blush color (hex, e.g. '#FF5070' or '#FF8C40')",
  "fabricColor": "The fabric/skin backing material color of the toy around the screen (hex, e.g. '#F3EFE9' for soft linen, '#121214' for gothic black canvas)",
  "highlightStyle": "Specify one of the supported eye-catching highlights: 'paw' | 'heart' | 'dot' | 'spiral' | 'star' | 'glass'",
  "singleEyeMode": true (Unless the user explicitly asks for "双眼", "两只眼", "double eyes", or "paired eyes" in their prompt, you MUST default singleEyeMode to true to support single-screen cyclops or central circular monitors),
  "lockGlassHighlights": true (By default true to lock the liquid 3D glossy bubbles style, false to let bubbles respond dynamically),
  "customSpeed": A playback speed multiplier typically between 0.6 (for high-inertia sleepy sloths/bears) and 1.5 (for energetic birds/kitties),
  "customScale": Pupil scaling factor between 0.8 and 1.5,
  "explanation": "A concise, elegant, design-centric review explaining why this color palette and highlight style matches their character, alongside helpful embedded micro-controller deployment tips (MIME/DMA Circular displays and Flash optimization)."
}

Make sure both hex colors coordinates look high-contrast, premium, and visually stunning. Do not use generic boring primary colors like '#FF0000' or '#0000FF'. Choose warm grays, muted pastels, cosmic metallics, cyberpunk neon rings, or luxurious matte shadows.
`;

      // FIRST: Check if custom third-party OpenAI-compatible model credentials are provided
      if (customEndpoint && customApiKey) {
        let url = customEndpoint;
        if (!url.endsWith('/chat/completions')) {
          url = url.replace(/\/+$/, '') + '/chat/completions';
        }

        console.log(`[Third-Party Engine] Fetching from custom URL: ${url} (Model: ${customModel})`);

        // Build messages in standard OpenAI format
        const userContent: any[] = [];
        if (imageBase64 && imageMimeType) {
          const cleanBase64 = imageBase64.startsWith("data:") 
            ? imageBase64 
            : `data:${imageMimeType};base64,${imageBase64}`;
          userContent.push({
            type: "image_url",
            image_url: {
              url: cleanBase64
            }
          });
        }

        userContent.push({
          type: "text",
          text: prompt || "根据一个高档科技感的毛绒小猫玩偶设计配套眼睛外观，具有迷幻而温柔的科技粉色夜光。"
        });

        const fetchPayload = {
          model: customModel || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemInstruction
            },
            {
              role: "user",
              content: userContent
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.9
        };

        const apiResponse = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${customApiKey}`
          },
          body: JSON.stringify(fetchPayload)
        });

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          throw new Error(`Third party API error (${apiResponse.status}): ${errText}`);
        }

        const resData = await apiResponse.json() as any;
        let textChoice = resData.choices?.[0]?.message?.content || "{}";
        
        // Clean markdown blocks if returned by less strict model providers
        textChoice = textChoice.replace(/```json\s*/i, "").replace(/```\s*$/, "").trim();
        const configResult = JSON.parse(textChoice);

        return res.json({
          success: true,
          model: customModel || "third-party",
          config: configResult
        });
      }

      // SECOND: Fallback to Gemini Client if no third-party credentials provided
      if (!ai) {
        return res.status(500).json({
          success: false,
          error: "Gemini API key is not configured in environment variables. Please check Settings > Secrets in AI Studio Workspace."
        });
      }

      const modelToUse = customModel || "gemini-3.5-flash";
      const contents: any[] = [];
      
      // If image is uploaded as base64, add it as inlineData part
      if (imageBase64 && imageMimeType) {
        // Clean up base64 prefix if present
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        contents.push({
          inlineData: {
            data: cleanBase64,
            mimeType: imageMimeType
          }
        });
      }

      // Add user prompt text
      contents.push({
        text: prompt || "根据一个高档科技感的毛绒小猫玩偶设计配套眼睛外观，具有迷幻而温柔的科技粉色夜光。"
      });

      // Query Gemini
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.95
        }
      });

      const responseText = response.text || "{}";
      const configResult = JSON.parse(responseText);

      return res.json({
        success: true,
        model: modelToUse,
        config: configResult
      });

    } catch (error: any) {
      console.error("Gemini Eye Generation Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An unexpected error occurred during eye model generations."
      });
    }
  });

  // Serve static files in production or hook up Vite middlewares in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Universal Eye Studio dev server running on http://localhost:${PORT}`);
  });
}

startServer();
