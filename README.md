# 🎮 Rhyme Racer

A rhythm-based lyric completion racing game for mobile devices built with React Native and Expo SDK 53.

## 📱 Game Concept

Rhyme Racer is an engaging rhythm racing game where players drive their car through animated road tiles and tap rhyming answers when their car enters green timing zones. The game combines rhythm timing, word recognition, and racing elements for an exciting gameplay experience.

## 🎯 Game Features

- **Magic Tiles Racing**: Drive your car through animated road tiles with green timing zones
- **Rhythm Synchronization**: Tap answers when your car is in the green zone for perfect timing
- **Lyric Completion**: Complete rhyming phrases with static answer choices
- **Combo System**: Build combos for speed boosts and visual effects
- **Real-time Scoring**: Track accuracy, timing, and reaction speed
- **Visual Feedback**: Smooth animations, beat ripples, and boost effects
- **Performance Metrics**: Four detailed scoring categories

## 📊 Scoring System

The game tracks four key metrics:

1. **Rhyme Accuracy Score** (0-100%): Percentage of correct rhyming words chosen
2. **Beat Sync Accuracy** (in ms): Average timing offset from the beat zone
3. **Reaction Speed Average** (in ms): Average time from lyric display to tap
4. **Novelty Score** (0-100%): Random performance bonus

## 🛠️ Technical Stack

- **React Native**: 0.79.5
- **React**: 19.0.0
- **Expo SDK**: 53.0.0
- **Navigation**: @react-navigation/native & @react-navigation/stack
- **Audio**: expo-av for beat playback
- **Animations**: React Native Animated API for smooth, performant animations
- **Graphics**: react-native-svg for car, skyline, and road elements
- **Game Engine**: react-native-game-engine
- **JavaScript Engine**: Hermes (configured in app.json)

## 🚀 Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rhyme-racer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Add audio file** (optional)
   - Place a 2.4-second, 50 BPM audio file as `assets/beat.mp3`
   - The app includes a fallback silent audio for testing

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## 🎮 How to Play

1. **Game Start**: The game begins with a 1-second countdown
2. **Racing**: Your car moves along an animated road with moving tiles
3. **Green Zones**: Green timing zones appear on the road
4. **Lyric Display**: Rhyming prompts appear at the top of the screen
5. **Answer Choices**: Three static answer choices appear below
6. **Timing**: Tap the correct answer when your car is in the green zone
7. **Combo System**: Build combos for speed boosts and visual effects
8. **Scoring**: Correct rhymes and good timing earn higher scores
9. **Game Duration**: 90 seconds of continuous gameplay

## 📁 Project Structure

```
rhyme-racer/
├── App.js                 # Main app with navigation
├── screens/
│   ├── GameScreen.js      # Core gameplay logic with Reanimated
│   └── ResultScreen.js    # Score display
├── components/
│   ├── AnswerTile.js      # Animated answer choice tiles
│   └── CarIndicator.js    # Player car with boost effects
├── data/
│   └── lyricsData.js      # Rhyming prompts and options
├── assets/
│   ├── README.md          # Audio file instructions
│   └── beat.mp3          # Background beat (add your file)
├── package.json           # Dependencies
├── app.json              # Expo configuration
└── babel.config.js       # Babel configuration with Reanimated plugin
```

## 🎵 Audio Requirements

### Beat File Specifications
- **Format**: MP3
- **Duration**: 2.4 seconds (looping)
- **BPM**: 50 beats per minute (slower for easier gameplay)
- **Purpose**: Background rhythm for synchronization

### Adding Your Own Beat
1. Create or download a 50 BPM audio file
2. Trim to exactly 2.4 seconds
3. Ensure seamless looping
4. Save as `assets/beat.mp3`

## 🎨 Customization

### Adding New Lyrics
Edit `data/lyricsData.js` to add new rhyming prompts:

```javascript
{
  id: 11,
  prompt: "The sun is bright and full of ___",
  options: ["light", "might", "sight"],
  correct: "light"
}
```

### Modifying Game Parameters
Adjust constants in `screens/GameScreen.js`:
- `BEAT_INTERVAL`: Time between beats (1200ms for 50 BPM)
- `GAME_DURATION`: Total game time (90000ms = 90 seconds)
- `HIT_ZONE_OFFSET`: Timing tolerance (±300ms)

## 🔧 Development

### Available Scripts
- `npm start`: Start Expo development server
- `npm run android`: Run on Android emulator
- `npm run ios`: Run on iOS simulator
- `npm run web`: Run in web browser

### Debugging
- Use Expo DevTools for debugging
- Check console logs for timing and scoring data
- Test on both iOS and Android devices

## 📱 Platform Support

- **iOS**: 13.0+
- **Android**: API level 21+
- **Expo Go**: Compatible with latest version

## 🎯 Performance Optimizations

- **React Native Animated API**: Smooth animations using native driver
- **Memoization**: Optimized component rendering with React.memo and useMemo
- **Throttled Updates**: Reduced React re-renders for better performance
- **Native Driver**: All animations run on the UI thread
- **Memory Management**: Efficient cleanup of animated components

## 🚀 Animation Features

### React Native Animated Implementation
- **Animated Values**: `carX`, `backgroundOffset`, `roadOffset` for smooth movement
- **Coordinated Animations**: Skyline and road animations synchronized
- **Native Driver**: All animations run on UI thread for 60fps performance
- **Interpolation**: Smooth value interpolation for natural movement

### Visual Effects
- **Car Movement**: Smooth translation with boost scaling
- **Green Zone Pulse**: Animated timing indicators
- **Beat Ripple**: Expanding circles synced to beat
- **Combo Animations**: Scale and glow effects for combos
- **Answer Choices**: Pop-in animations with spring physics

## 🐛 Troubleshooting

### Common Issues

1. **Audio not playing**
   - Check if `assets/beat.mp3` exists
   - Verify device volume is on
   - Try restarting the app

2. **Animations lagging**
   - Close other apps to free memory
   - Restart the development server
   - Check device performance

3. **Animation issues**
   - Clear Metro cache: `npx expo start --clear`
   - Check for native driver compatibility
   - Restart the development server

4. **Navigation issues**
   - Ensure all navigation dependencies are installed
   - Clear Metro bundler cache: `npx expo start --clear`

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review Expo documentation
- Open an issue on GitHub

---

**Enjoy playing Rhyme Racer! 🎵🏎️** 