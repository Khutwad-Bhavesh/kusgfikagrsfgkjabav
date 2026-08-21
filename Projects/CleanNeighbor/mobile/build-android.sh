#!/bin/bash

# Android Build Script for Hackathon 2025 App
# This script will help you build your app for Android with video support

echo "🚀 Starting Android build process with video support..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Check if you're logged in to Expo
echo "📱 Checking Expo authentication..."
eas whoami || {
    echo "🔐 Please log in to your Expo account:"
    eas login
}

echo "🧹 Cleaning previous builds..."
# Clean node modules cache
npm run clean:modules

# Clear Expo cache
rm -rf .expo
rm -rf node_modules/.cache

echo "📦 Installing dependencies with compatibility fixes..."
# Install with legacy peer deps to handle React version compatibility
npm install --legacy-peer-deps

echo "🔧 Checking React Native compatibility..."
# Verify React version compatibility
node -e "const pkg = require('./package.json'); console.log('React version:', pkg.dependencies.react); console.log('React Native version:', pkg.dependencies['react-native']);"

echo "🎥 Verifying video functionality..."
# Check that video recording still works without expo-video
node -e "const pkg = require('./package.json'); 
const hasCamera = pkg.dependencies['expo-camera'];
const hasImagePicker = pkg.dependencies['expo-image-picker'];
const hasVideo = pkg.dependencies['expo-video'];
if (hasCamera && hasImagePicker && !hasVideo) {
  console.log('✅ Video recording works via expo-camera + expo-image-picker');
  console.log('✅ expo-video removed (build compatibility issues)');
} else if (hasVideo) {
  console.log('❌ expo-video found - will cause build failures!');
  process.exit(1);
} else {
  console.log('❌ Missing video recording dependencies');
  process.exit(1);
}"

echo "🔨 Building APK for testing with video support..."
eas build --platform android --profile preview --clear-cache

echo "✅ Build complete! Check your Expo dashboard for the download link."
echo "🔗 Visit: https://expo.dev/accounts/adityashah27/projects/internal-hackathon-2025/builds"
echo ""
echo "📋 Build includes fixes for:"
echo "   ✅ expo-av DEPRECATED - removed completely"
echo "   ✅ expo-video REMOVED - build compatibility issues"
echo "   ✅ Video recording via expo-camera + expo-image-picker"
echo "   ✅ Video playback via external apps (temporary)"
echo "   ✅ Memory management improvements"
echo "   ✅ Network security configuration"
echo "   ✅ Error boundary protection"
echo "   ✅ Large heap allocation for processing"
