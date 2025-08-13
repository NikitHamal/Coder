# 🚀 GitHub Pages Deployment Guide

## Quick Deploy (5 minutes!)

### 1. Fork This Repository
- Click the "Fork" button at the top right of this page
- Choose your GitHub username as the destination

### 2. Enable GitHub Pages
- Go to your forked repository
- Click "Settings" tab
- Scroll down to "Pages" section
- Under "Source", select "Deploy from a branch"
- Choose "main" branch
- Click "Save"

### 3. Wait for Deployment
- GitHub will automatically build and deploy your site
- This usually takes 2-5 minutes
- You'll see a green checkmark when it's ready

### 4. Access Your Site
- Your site will be available at: `https://yourusername.github.io/coder-ai`
- Share this URL with others!

## 🔧 Custom Domain (Optional)

### 1. Add Custom Domain
- In repository Settings > Pages
- Enter your domain (e.g., `coder.yourdomain.com`)
- Click "Save"

### 2. Configure DNS
Add these records to your domain provider:
```
Type: CNAME
Name: coder (or @ for root domain)
Value: yourusername.github.io
```

### 3. Wait for DNS Propagation
- Can take up to 24 hours
- GitHub will automatically provision SSL certificate

## 📁 File Structure

Your repository should look like this:
```
coder-ai/
├── index.html          # Main page
├── main.js            # App logic
├── styles.css         # Styling
├── aiModels.js        # AI integration
├── .github/workflows/ # Auto-deploy
└── README.md          # Documentation
```

## 🚨 Common Issues

### Site Not Loading
- Check if GitHub Pages is enabled
- Verify the branch is set to "main"
- Wait a few minutes for deployment

### AI Models Not Working
- Ensure you have internet connection
- Check browser console for errors
- Try refreshing the page

### Styling Issues
- Clear browser cache
- Check if CSS files are loading
- Verify file paths are correct

## 🔄 Updates

### Automatic Updates
- Push changes to main branch
- GitHub Pages automatically redeploys
- No manual steps needed!

### Manual Redeploy
- Go to repository Settings > Pages
- Click "Re-run workflow" if available

## 📱 Testing

### Local Testing
```bash
# Clone your repository
git clone https://github.com/yourusername/coder-ai.git
cd coder-ai

# Start local server
python3 -m http.server 8000

# Open http://localhost:8000
```

### Browser Testing
- Test on Chrome, Firefox, Safari, Edge
- Test mobile responsiveness
- Check all features work

## 🎯 Next Steps

After deployment:
1. **Test all features** - AI chat, file editing, etc.
2. **Customize** - Modify colors, add your logo
3. **Share** - Send the URL to friends and colleagues
4. **Contribute** - Make improvements and submit PRs

## 🆘 Need Help?

- Check the main README.md for detailed documentation
- Open an issue in the repository
- Check GitHub Pages documentation
- Verify your repository settings

---

**🎉 Congratulations! You now have a live AI-powered coding environment!**