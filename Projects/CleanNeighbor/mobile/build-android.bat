@echo off
echo 🚀 Starting Android build process...

echo 📦 Installing dependencies...
npm install

echo 🔐 Checking Expo authentication...
npx eas-cli whoami
if %errorlevel% neq 0 (
    echo Please log in to your Expo account:
    npx eas-cli login
)

echo 🔨 Building APK for testing...
git init >nul 2>&1
npx eas-cli build --platform android --profile preview
rmdir /s /q .git

echo ✅ Build complete! Check your Expo dashboard for the download link.
echo 🔗 Visit: https://expo.dev/accounts/[your-username]/projects/shuchithvam/builds
pause
