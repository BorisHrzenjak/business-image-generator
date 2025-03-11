# Business Image Generator

A web application that generates professional business images using the Together AI FLUX model. This application helps create high-quality images for business use cases like presentations, marketing materials, and more.

## Features

- Generate business-focused images with enhanced prompts
- Select from various image types: photos, illustrations, vectors, icons
- Choose different styles: minimalistic, realistic 3D, clipart
- Specify the purpose of your image: presentations, flyers, brochures, posters, etc.
- Select from common aspect ratios
- Download generated images
- Copy enhanced prompts for future use

## Technologies Used

- Node.js and Express for the backend
- EJS for templating
- Together AI FLUX.1-schnell-Free model for image generation
- Vanilla JavaScript for frontend interactivity

## Setup and Installation

1. Clone the repository:
```
git clone <repository-url>
cd business-image-generator
```

2. Install dependencies:
```
npm install
```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Together AI API key:
   ```
   TOGETHER_API_KEY=your_api_key_here
   ```

4. Start the application:
```
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## Deploying to Vercel

### Prerequisites
- A [Vercel](https://vercel.com) account
- [Vercel CLI](https://vercel.com/docs/cli) installed (optional for command line deployment)

### Deployment Steps

#### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Push your code to a GitHub, GitLab, or Bitbucket repository

2. Log in to your Vercel account and click "New Project"

3. Import your repository from GitHub, GitLab, or Bitbucket

4. Configure your project:
   - Framework Preset: Select "Other"
   - Build Command: Leave as default
   - Output Directory: Leave as default
   - Install Command: `npm install`
   - Development Command: `npm run dev`

5. Add your environment variables:
   - Click on "Environment Variables"
   - Add `TOGETHER_API_KEY` with your Together AI API key

6. Click "Deploy" and wait for the deployment to complete

7. Once deployed, Vercel will provide you with a URL to access your application

#### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI if you haven't already:
```
npm install -g vercel
```

2. Log in to your Vercel account:
```
vercel login
```

3. Navigate to your project directory and run:
```
vercel
```

4. Follow the prompts to configure your project:
   - Set up and deploy: Yes
   - Link to existing project: No
   - Project name: Accept default or enter a custom name
   - Directory: ./
   - Override settings: No

5. Add your environment variables through the Vercel dashboard after deployment

### Updating Your Deployment

After making changes to your code:

1. Push your changes to your repository

2. Vercel will automatically redeploy your application if you used the dashboard method

3. If you used the CLI, run `vercel` again to deploy the updated version

### Troubleshooting

- If you encounter any issues with the deployment, check the Vercel logs for error messages
- Ensure your environment variables are correctly set in the Vercel dashboard
- Make sure your application is running correctly locally before deploying

## API Usage

This application uses the Together AI FLUX.1-schnell-Free model, which has a rate limit of 10 images per minute.

## License

MIT
