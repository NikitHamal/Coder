# Coder AI - Modern AI-Powered Coding Environment

A beautiful, modern, and intelligent coding environment that combines the power of multiple free AI models with an elegant code editor.

## ✨ Features

### 🤖 AI-Powered Coding Assistant
- **Multiple Free AI Models**: GPT4Free, DeepSeek, OpenAI (Free), Claude (Free), and Gemini 2.5
- **Smart Code Generation**: Write, debug, explain, and optimize code with AI assistance
- **Context-Aware**: AI understands your codebase and provides relevant suggestions
- **Streaming Responses**: Real-time AI responses for better user experience
- **No API Keys Required**: Most models work out of the box

### 🎨 Modern UI/UX
- **Beautiful Design**: Clean, modern interface inspired by Cursor and VS Code
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile devices
- **Dark Theme**: Easy on the eyes with customizable color schemes
- **Smooth Animations**: Delightful micro-interactions and transitions
- **Material Design**: Consistent iconography and visual language

### 💻 Code Editor
- **Syntax Highlighting**: Support for multiple programming languages
- **File Management**: Easy file creation, editing, and organization
- **Tab System**: Multi-file editing with intuitive tab management
- **Search & Replace**: Powerful find and replace functionality
- **Terminal Integration**: Built-in terminal for command execution

### 🚀 Performance
- **Lightning Fast**: Optimized for speed and responsiveness
- **Efficient Rendering**: Smooth scrolling and editing experience
- **Memory Optimized**: Minimal resource usage
- **Offline Capable**: Works without internet connection (basic features)

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js 18+ (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/coder-ai.git
   cd coder-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:8000`

### Production Build
```bash
npm run build
```

## 🎯 AI Models

### Free Models (No API Key Required)
- **GPT4Free (g4f)**: Primary free model with excellent performance
- **DeepSeek**: Great for coding and technical tasks
- **OpenAI (Free)**: Access to OpenAI models via g4f
- **Anthropic (Free)**: Claude models for creative and analytical tasks

### Premium Models (API Key Required)
- **Gemini 2.5 Flash**: Google's latest AI model
- **Gemini 2.5 Pro**: Advanced Gemini model for complex tasks

## ⌨️ Keyboard Shortcuts

### General
- `Ctrl + S` - Save current file
- `Ctrl + N` - Create new file
- `Ctrl + F` - Find and replace
- `Ctrl + P` - Preview HTML file
- `Ctrl + \` - Split editor
- `Ctrl + ,` - Open settings

### AI Assistant
- `Ctrl + I` - Focus AI input
- `Ctrl + Enter` - Send AI message
- `Enter` - Send message (when AI input is focused)

### Navigation
- `F3` - Find next
- `Shift + F3` - Find previous
- `Ctrl + `` - Toggle terminal

## 🎨 Customization

### Themes
- Atom One Dark (default)
- GitHub Light
- Dracula
- Monokai
- Coder Light

### Font Sizes
- 12px, 14px, 16px, 18px, 20px

### AI Settings
- Auto-save conversation history
- Enable/disable streaming responses
- Model selection preferences

## 📱 Mobile Support

The application is fully responsive and works great on mobile devices:
- Touch-friendly interface
- Adaptive layouts
- Mobile-optimized controls
- Swipe gestures for navigation

## 🔧 Development

### Project Structure
```
coder-ai/
├── index.html          # Main HTML file
├── main.js            # Application entry point
├── aiModels.js        # AI models integration
├── aiChatModule.js    # AI chat functionality
├── editor.js          # Code editor logic
├── ui.js              # User interface management
├── styles.css         # Main stylesheet
├── light-theme.css    # Light theme styles
├── gemini.js          # Gemini API integration
├── fileStorage.js     # File management
├── fileOps.js         # File operations
├── modal.js           # Modal dialogs
└── package.json       # Dependencies
```

### Key Technologies
- **Frontend**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3 with CSS Variables
- **AI Integration**: g4f.js, REST APIs
- **Build Tool**: None (vanilla setup)
- **Fonts**: Inter, Material Icons
- **Syntax Highlighting**: highlight.js

### Adding New Features
1. Create feature module in separate file
2. Import and integrate in main.js
3. Add corresponding UI elements
4. Update styles.css for new components
5. Test across different screen sizes

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines
- Follow existing code style and conventions
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation as needed
- Ensure mobile responsiveness

## 🐛 Troubleshooting

### Common Issues

**AI Models Not Working**
- Check internet connection
- Try refreshing the page
- Verify g4f.js is loaded correctly
- Check browser console for errors

**Performance Issues**
- Close unnecessary browser tabs
- Clear browser cache
- Check available memory
- Disable browser extensions

**Mobile Issues**
- Ensure viewport meta tag is present
- Test on different devices
- Check touch event handling

### Getting Help
- Check the browser console for error messages
- Review the network tab for failed requests
- Test with different browsers
- Create an issue with detailed description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **gpt4free**: For providing free access to AI models
- **Material Design**: For the beautiful icon set
- **Inter Font**: For the excellent typography
- **Highlight.js**: For syntax highlighting
- **Community**: For feedback and contributions

## 🔮 Roadmap

### Upcoming Features
- [ ] Code completion and IntelliSense
- [ ] Git integration
- [ ] Extension system
- [ ] Collaborative editing
- [ ] Advanced AI workflows
- [ ] Custom AI model training
- [ ] Plugin marketplace

### Long-term Goals
- [ ] Desktop application (Electron)
- [ ] Cloud sync and backup
- [ ] Team collaboration features
- [ ] AI-powered code review
- [ ] Performance analytics
- [ ] Custom themes and plugins

---

**Made with ❤️ by the Coder AI community**

For questions, support, or contributions, please open an issue or reach out to us! 