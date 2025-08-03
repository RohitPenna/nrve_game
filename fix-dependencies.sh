#!/bin/bash

echo "🧹 Cleaning up dependencies..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf .expo

echo "📦 Installing dependencies..."
npm install

echo "🔄 Clearing Metro cache..."
npx expo start --clear

echo "✅ Setup complete! Run 'npx expo start' to start the development server." 