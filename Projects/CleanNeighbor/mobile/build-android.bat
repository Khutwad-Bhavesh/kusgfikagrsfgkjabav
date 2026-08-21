@echo off
echo 🚀 Starting Android build process...

echo 📦 Installing dependencies...
npm install

echo 🔐 Checking Expo authentication...
eas whoami
if %errorlevel% neq 0 (
    echo Please log in to your Expo account:
    eas login
)

echo 🔨 Building APK for testing...
eas build --platform android --profile preview

echo ✅ Build complete! Check your Expo dashboard for the download link.
echo 🔗 Visit: https://expo.dev/accounts/adityashah27/projects/internal-hackathon-2025/builds
pause
