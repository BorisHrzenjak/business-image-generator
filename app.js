require('dotenv').config();
const express = require('express');
const path = require('path');
const Together = require('together-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index');
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
