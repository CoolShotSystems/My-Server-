
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

// --- SETUP ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API_KEY environment variable not set. Please create a .env file.");
}

const ai = new GoogleGenAI({ apiKey });

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase payload limit for base64 images
const upload = multer({ storage: multer.memoryStorage() }); // For handling file uploads in memory

// --- HEALTH CHECK ---
app.get('/v1/health-check', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- API ROUTES ---

// Generic handler for all text-based prompts
app.post('/v1/text-prompt', async (req, res) => {
  const { model, fullPrompt } = req.body;
  if (!model || !fullPrompt) {
    return res.status(400).json({ error: 'Model and fullPrompt are required.' });
  }

  console.log(`[Text Prompt] Calling model ${model}...`);
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
    });
    console.log(`[Text Prompt] Success.`);
    res.json({ result: response.text });
  } catch (error) {
    console.error('[Text Prompt] Error:', error);
    res.status(500).json({ error: `Failed to get response from Gemini. ${error.message}` });
  }
});

// Handler for image generation
app.post('/v1/generate-image', async (req, res) => {
  const { model, prompt } = req.body;
  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }

  console.log(`[Image Gen] Calling model ${model}...`);
  try {
    const response = await ai.models.generateImages({
      model: model,
      prompt: prompt,
      config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
    console.log(`[Image Gen] Success.`);
    res.json({ imageUrl });
  } catch (error) {
    console.error('[Image Gen] Error:', error);
    res.status(500).json({ error: `Failed to generate image. ${error.message}` });
  }
});

// Handler for analyzing uploaded images
app.post('/v1/analyze-image', upload.single('image'), async (req, res) => {
    const { model, prompt } = req.body;
    const imageFile = req.file;

    if (!model || !imageFile) {
        return res.status(400).json({ error: 'Model and an image file are required.' });
    }

    console.log(`[Image Analysis] Calling model ${model}...`);
    try {
        const imagePart = {
            inlineData: {
                data: imageFile.buffer.toString('base64'),
                mimeType: imageFile.mimetype,
            },
        };
        const textPart = { text: prompt || "Describe this image in detail." };
        
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] }
        });

        console.log(`[Image Analysis] Success.`);
        res.json({ result: response.text });
    } catch (error) {
        console.error('[Image Analysis] Error:', error);
        res.status(500).json({ error: `Failed to analyze image. ${error.message}` });
    }
});


// --- VIDEO GENERATION ROUTES ---
const videoOperations = new Map(); // Store ongoing video operations in memory

// 1. Start video generation
app.post('/v1/generate-video', async (req, res) => {
    const { model, prompt } = req.body;
    if (!model || !prompt) {
        return res.status(400).json({ error: 'Model and prompt are required.' });
    }

    console.log(`[Video Gen] Starting generation for model ${model}...`);
    try {
        const operation = await ai.models.generateVideos({
            model: model,
            prompt: prompt,
            config: { numberOfVideos: 1 }
        });
        
        const operationId = operation.name;
        videoOperations.set(operationId, operation);

        console.log(`[Video Gen] Operation started with ID: ${operationId}`);
        res.status(202).json({ operationId }); // 202 Accepted
    } catch (error) {
        console.error('[Video Gen] Error:', error);
        res.status(500).json({ error: `Failed to start video generation. ${error.message}` });
    }
});

// 2. Poll for video status
app.get('/v1/video-status/:operationId', async (req, res) => {
    const { operationId } = req.params;
    let operation = videoOperations.get(operationId);

    if (!operation) {
        return res.status(404).json({ error: 'Operation not found.' });
    }

    console.log(`[Video Status] Polling for operation: ${operationId}`);
    try {
        if (!operation.done) {
            operation = await ai.operations.getVideosOperation({ operation: operation });
            videoOperations.set(operationId, operation); // Update stored operation
        }

        if (operation.done) {
            console.log(`[Video Status] Operation ${operationId} is done.`);
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const videoUrl = `${downloadLink}&key=${apiKey}`;
                videoOperations.delete(operationId); // Clean up finished operation
                res.json({ status: 'done', videoUrl });
            } else {
                 videoOperations.delete(operationId);
                 res.json({ status: 'failed', error: 'Video generation finished but no URI was returned.' });
            }
        } else {
            console.log(`[Video Status] Operation ${operationId} is still processing.`);
            res.json({ status: 'processing' });
        }
    } catch (error) {
        console.error(`[Video Status] Error polling ${operationId}:`, error);
        videoOperations.delete(operationId);
        res.status(500).json({ status: 'failed', error: `Failed to poll video status. ${error.message}` });
    }
});


// --- SERVER START ---
app.listen(PORT, () => {
  console.log(`✅ Real API server running on http://localhost:${PORT}`);
});
