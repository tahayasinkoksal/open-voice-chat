# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-01-25

### Added
- 🎨 **Modern UI Design**: Complete redesign with purple/cyan gradient theme
- 😂 **Reaction System**: Share sound effects with everyone in the room
  - Dynamic MP3 loading from `public/tepkiler/` folder
  - Smart filename parsing (e.g., `ya-sabir.mp3` → "Ya Sabir")
  - Single reaction playback at a time (prevents audio overlap)
- 👥 **Tabbed Interface**: Chat, Participants, and Reactions tabs
  - Real-time participant list with online status
  - Screen sharing indicator (🖥️) for active sharers
  - Clean separation of concerns
- 🖥️ **Fullscreen Screen Sharing**: Double-click or button to enter fullscreen mode
- 🎵 **Custom Sound Notifications**: Support for custom join/leave MP3 files
- 🎨 **Glassmorphism Effects**: Modern glass-like UI elements with backdrop blur
- 🎭 **Gradient Buttons**: Beautiful gradient colors throughout the interface
- 🔔 **Enhanced Notifications**: Better visual and audio feedback

### Changed
- 🎨 **Color Scheme**: Updated to modern purple (#8b5cf6) and cyan (#06b6d4) theme
- 📐 **Layout**: Moved control buttons to header for better accessibility
- 🖥️ **Screen Sharing**: Hidden user grid when screen sharing is active
- 💬 **Chat Messages**: Enhanced styling with background and borders
- 🎤 **Mute Button**: Fixed color issue - now uses proper gradient colors
- 📱 **Mobile Experience**: Improved responsive design for all screen sizes

### Fixed
- 🐛 **Button Visibility**: Control buttons now always visible in header
- 🎨 **Mute Button Colors**: Fixed black background issue on toggle
- 🔊 **Audio Overlap**: Reactions now stop previous audio before playing new one
- 📏 **Layout Issues**: Fixed screen sharing overlap with user cards

## [1.0.0] - Initial Release

### Features
- 📡 P2P voice chat with WebRTC
- 🖥️ Screen sharing with system audio
- 💬 Real-time text chat
- 🗳️ Vote kick system with IP banning
- 🔒 Password-protected rooms
- 🎤 Listener mode for users without microphone
- 🔇 Individual user mute and volume control
- 🎭 Unique nickname handling
- 📱 Mobile responsive design
- 🐳 Docker support
- 🇹🇷 Turkish localization
