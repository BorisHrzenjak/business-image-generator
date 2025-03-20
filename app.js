require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');
const https = require('https');
const Together = require('together-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize Google Generative AI
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Editor page route
app.get('/editor', (req, res) => {
  // Check if the user is authenticated (if Clerk is configured)
  // Note: This allows unauthenticated users to access the editor for now
  // but we'll add a premium feature check in the edit-image endpoint
  res.render('editor');
});

// API endpoint to generate images
app.post('/generate-image', async (req, res) => {
  try {
    const { 
      prompt, 
      aspectRatio, 
      purpose, 
      style, 
      imageType,
      steps = 4
    } = req.body;

    // Validate input
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Create meta-prompt based on selected options
    const metaPrompt = generateMetaPrompt(purpose, style, imageType);
    const enhancedPrompt = `${metaPrompt} ${prompt}`;
    
    console.log('Enhanced prompt:', enhancedPrompt);

    // Set dimensions based on aspect ratio
    const dimensions = getDimensions(aspectRatio);

    // Initialize Together AI client
    const together = new Together({
      apiKey: process.env.TOGETHER_API_KEY
    });

    // Generate image
    const response = await together.images.create({
      model: "black-forest-labs/FLUX.1-schnell-Free",
      prompt: enhancedPrompt,
      steps: parseInt(steps) > 4 ? 4 : parseInt(steps) < 1 ? 1 : parseInt(steps), // Ensure steps is between 1-4
      width: dimensions.width,
      height: dimensions.height,
      n: 1
    });

    console.log('Image generation response received');
    console.log('Response data structure:', Object.keys(response));
    console.log('Response data[0] structure:', Object.keys(response.data[0]));
    
    // Check if b64_json exists, otherwise try url
    let imageData = null;
    if (response.data[0].b64_json) {
      imageData = response.data[0].b64_json;
    } else if (response.data[0].url) {
      // If we have a URL instead of base64 data, we'll return the URL
      imageData = response.data[0].url;
    }
    
    // Return the image data
    res.json({ 
      success: true, 
      imageData,
      isUrl: !response.data[0].b64_json && response.data[0].url ? true : false,
      enhancedPrompt
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image', 
      message: error.message 
    });
  }
});

// API endpoint for image editing with Gemini
app.post('/edit-image', async (req, res) => {
  try {
    const { imageData, prompt, isBase64 } = req.body;
    
    if (!imageData || !prompt) {
      return res.status(400).json({ error: 'Image data and prompt are required' });
    }

    // Check if Clerk is configured and this is a premium feature
    // If CLERK_SECRET_KEY is set, we'll check for authentication
    // Otherwise, we'll allow all users to access this feature
    if (process.env.CLERK_SECRET_KEY) {
      // Get the user from the request (assuming Clerk middleware is set up)
      const user = req.auth?.userId;
      
      // If no user is found and this is a premium feature, return an error
      if (!user) {
        return res.status(403).json({ 
          error: 'Authentication required', 
          message: 'Image editing is a premium feature. Please sign in to use it.' 
        });
      }
      
      // Log the authenticated user
      console.log(`User ${user} is editing an image`);
    }

    // Process image data - it could be a URL or base64 string
    let imageContent;
    
    // Handle image data based on whether it's a URL, base64, or already processed
    if (imageData.startsWith('http')) {
      // If it's a URL
      try {
        // Fetch the image from the URL using http/https
        const fetchImage = (url) => {
          return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const req = protocol.get(url, (response) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch image: ${response.statusCode}`));
                return;
              }
              
              const chunks = [];
              response.on('data', (chunk) => chunks.push(chunk));
              response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer.toString('base64'));
              });
            });
            
            req.on('error', reject);
            req.end();
          });
        };
        
        imageContent = await fetchImage(imageData);
      } catch (error) {
        console.error('Error fetching image from URL:', error);
        return res.status(500).json({ error: 'Failed to fetch image from URL' });
      }
    } else if (isBase64 === false) {
      // If it's a data URL that was already processed in a previous edit
      try {
        // Fetch the image from the data URL
        const fetchImage = (url) => {
          return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const req = protocol.get(url, (response) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch image: ${response.statusCode}`));
                return;
              }
              
              const chunks = [];
              response.on('data', (chunk) => chunks.push(chunk));
              response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer.toString('base64'));
              });
            });
            
            req.on('error', reject);
            req.end();
          });
        };
        
        imageContent = await fetchImage(imageData);
      } catch (error) {
        console.error('Error processing image data:', error);
        return res.status(500).json({ error: 'Failed to process image data' });
      }
    } else {
      // If it's already a base64 string (from the client)
      imageContent = imageData;
    }

    // Check if GEMINI_API_KEY is set
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key is not configured', 
        message: 'Please set the GEMINI_API_KEY environment variable' 
      });
    }

    console.log("Attempting to edit image with Gemini...");

    // Initialize the Gemini API with the API key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Initialize Gemini model - using the specified model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 32,
        maxOutputTokens: 4096,
        responseModalities: ['Text', 'Image']
      },
    });

    // Create the image part for the model
    const imagePart = {
      inlineData: {
        data: imageContent,
        mimeType: "image/jpeg"
      }
    };

    // Create the text prompt
    const textPrompt = `Edit this image with the following changes: ${prompt}. Return the edited image.`;

    console.log("Sending request to Gemini API...");

    // Send the prompt to Gemini
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: textPrompt }, imagePart] }],
    });

    const response = await result.response;
    
    console.log("Received response from Gemini API");
    console.log("Response structure:", Object.keys(response));
    
    // Extract text and image from the response
    let responseText = '';
    let editedImageData = null;
    
    try {
      // Check if we have candidates with parts
      if (response.candidates && response.candidates.length > 0 && 
          response.candidates[0].content && response.candidates[0].content.parts) {
        
        const parts = response.candidates[0].content.parts;
        console.log("Response parts:", parts.length);
        
        // Process each part
        for (const part of parts) {
          if (part.text) {
            responseText += part.text;
          } else if (part.inlineData) {
            // This is the image data
            editedImageData = part.inlineData.data;
            console.log("Found image data in response");
          }
        }
      } else {
        // Fallback to the old method
        responseText = response.text();
        console.log("Response text length:", responseText.length);
        
        // Try to extract image data from the response text
        const base64Match = responseText.match(/data:image\/[^;]+;base64,([^"'\s]+)/);
        
        if (base64Match && base64Match[1]) {
          editedImageData = base64Match[1];
          console.log("Extracted image data from text");
        }
      }
    } catch (error) {
      console.error("Error processing response:", error);
      responseText = "Unable to process response";
    }
    
    if (!editedImageData) {
      console.log("No image data found in response");
      
      // Return a fallback response
      return res.json({
        success: true,
        response: "I've analyzed your request but couldn't generate an edited image. Here's my response: " + responseText,
        editedImageData: null
      });
    }
    
    // Return the response from Gemini
    res.json({ 
      success: true, 
      response: responseText || "Image edited successfully based on your instructions.",
      editedImageData
    });
  } catch (error) {
    console.error('Error editing image with Gemini:', error);
    res.status(500).json({ 
      error: 'Failed to edit image', 
      message: error.message 
    });
  }
});

// Helper function to generate meta-prompt
function generateMetaPrompt(purpose, style, imageType) {
  let metaPrompt = '';

  // Add style-specific prompts
  switch (style) {
    case 'minimalistic':
      metaPrompt += 'Clean, simple, minimalistic design with ample white space, ';
      break;
    case 'realistic-3d':
      metaPrompt += 'Photorealistic 3D rendering with detailed textures and lighting, ';
      break;
    case 'clipart':
      metaPrompt += 'Colorful clipart style with bold outlines and simple shapes, ';
      break;
    default:
      metaPrompt += 'Professional, high-quality, ';
  }

  // Add image type-specific prompts
  switch (imageType) {
    case 'icons':
      metaPrompt += 'simple icon design, clear silhouette, recognizable at small sizes, ';
      break;
    case 'photos':
      metaPrompt += 'high-resolution photograph, professional lighting, sharp details, ';
      break;
    case 'vectors':
      metaPrompt += 'vector graphic style, scalable, clean lines, ';
      break;
    case 'illustrations':
      metaPrompt += 'detailed illustration, artistic style, visually appealing, ';
      break;
    default:
      metaPrompt += 'visually appealing image, ';
  }

  // Add purpose-specific prompts
  switch (purpose) {
    case 'presentations':
      metaPrompt += 'suitable for business presentation slides, clear message, professional look, ';
      break;
    case 'flyers':
      metaPrompt += 'eye-catching flyer design, attention-grabbing, informative, ';
      break;
    case 'brochures':
      metaPrompt += 'elegant brochure layout, informative, professional, ';
      break;
    case 'posters':
      metaPrompt += 'bold poster design, large text, impactful visuals, ';
      break;
    case 'advertising':
      metaPrompt += 'compelling advertising visual, persuasive, brand-focused, ';
      break;
    case 'web-app-design':
      metaPrompt += 'modern web/app interface element, user-friendly, digital-first design, ';
      break;
    case 'marketing-materials':
      metaPrompt += 'effective marketing visual, brand-consistent, message-focused, ';
      break;
    default:
      metaPrompt += 'business-appropriate, professional context, ';
  }

  return metaPrompt.trim();
}

// Helper function to get dimensions based on aspect ratio
function getDimensions(aspectRatio) {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1024, height: 1024 };
    case '4:3':
      return { width: 1024, height: 768 };
    case '3:4':
      return { width: 768, height: 1024 };
    case '16:9':
      return { width: 1024, height: 576 };
    case '9:16':
      return { width: 576, height: 1024 };
    default:
      return { width: 1024, height: 1024 }; // Default to square
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
