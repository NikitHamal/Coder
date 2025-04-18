# SlideGenius - AI-Powered Slide Generator

SlideGenius is a web-based AI-powered slide generator designed for educators to create high-quality, customizable presentations quickly and easily.

## Features

- AI-powered slide generation from text prompts
- Customizable elements including text, images, code snippets, and lists
- Drag-and-drop interface for easy slide editing
- Multiple slide templates and styles
- Export to PDF
- Responsive design for desktop and mobile
- Clean, minimal black and white design

## Getting Started

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open `http://localhost:3001` in a modern web browser
5. Start creating slides!

## Usage

### Generating Slides with AI

1. Enter a descriptive prompt in the text area on the left sidebar
2. Select the number of slides and style
3. Click "Generate Slides"
4. Wait for the AI to generate your presentation

### Manual Editing

- Drag elements from the sidebar onto your slides
- Click on elements to edit their properties
- Add new slides with the + button
- Rearrange slides by dragging thumbnails
- Export your presentation to PDF with the Export button

## Technical Details

SlideGenius is built using vanilla HTML, CSS, and JavaScript for the frontend, with a Node.js Express server backend for AI integration.

### Files Structure

- `index.html` - Main HTML file
- `server.js` - Node.js Express server for AI integration
- `src/css/styles.css` - Styles for the application
- `src/js/`
  - `app.js` - Main application entry point
  - `slideManager.js` - Manages slide data
  - `uiManager.js` - Handles UI interactions
  - `aiService.js` - Handles AI content generation
  - `elementFactory.js` - Creates slide elements
  - `renderers.js` - Renders different element types
  - `exportService.js` - Handles exporting presentations

## AI Integration

The application uses the Qwen AI API for content generation via the Node.js server. The server handles authentication, prompt formatting, and response parsing, allowing the frontend to interact with the AI without exposing API keys.

### Server Endpoints

- `/api/generate-slides` - Generates educational slides content
- `/api/generate-image` - Generates descriptive image content

## Development

To run the server in development mode:
```
npm run dev
```

## License

This project is MIT licensed.

## Credits

Built using AI technologies for educators and presenters. 