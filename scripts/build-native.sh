#!/bin/bash

# ZUTATO Native Build Script
# This script builds and prepares the app for iOS and Android

set -e

echo "🚀 Starting ZUTATO Native Build Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if needed
print_status "Installing dependencies..."
npm install

# Build the web app
print_status "Building web application..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Web build failed!"
    exit 1
fi

print_success "Web build completed!"

# Sync with Capacitor
print_status "Syncing with Capacitor..."
npx cap sync

if [ $? -ne 0 ]; then
    print_error "Capacitor sync failed!"
    exit 1
fi

print_success "Capacitor sync completed!"

# Check platform arguments
if [ "$1" = "ios" ]; then
    print_status "Opening iOS project..."
    npx cap open ios
elif [ "$1" = "android" ]; then
    print_status "Opening Android project..."
    npx cap open android
elif [ "$1" = "run-ios" ]; then
    print_status "Running iOS app..."
    npx cap run ios
elif [ "$1" = "run-android" ]; then
    print_status "Running Android app..."
    npx cap run android
else
    print_status "Build completed! Available options:"
    echo "  ./scripts/build-native.sh ios          - Open iOS project in Xcode"
    echo "  ./scripts/build-native.sh android      - Open Android project in Android Studio"
    echo "  ./scripts/build-native.sh run-ios      - Run iOS app on simulator/device"
    echo "  ./scripts/build-native.sh run-android  - Run Android app on emulator/device"
fi

print_success "Build process completed! 🎉"
