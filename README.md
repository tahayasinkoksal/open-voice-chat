# Open Voice Chat

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg) ![Node.js](https://img.shields.io/badge/Node.js-vv14.x-green.svg) ![WebRTC](https://img.shields.io/badge/WebRTC-Realtime-orange.svg)

> **Open Voice Chat provides a robust, self-hosted, and peer-to-peer (P2P) solution for communities seeking private and efficient real-time communication. Designed for low-latency voice chat, it ensures direct connections between participants, enhancing privacy, reducing server load, and delivering a seamless, natural conversation experience. Ideal for gaming groups, online communities, and friends who value control over their communication infrastructure and desire a high-quality, secure voice platform.**

---

## 📸 Showcase

| Login Screen | Room View |
| :---: | :---: |
| ![Login Screen](screenshots/login.png) | ![Room View](screenshots/room-view.png) |

| Screen Share | Vote Kick |
| :---: | :---: |
| ![Screen Share](screenshots/screen-share.png) | ![Vote Kick](screenshots/vote-kick.png) |

<div align="center">

**Mobile View**

<img src="screenshots/chat-mobile.png" height="500" alt="Mobile Chat">

</div>

---

## ✨ Features

- 📡 **P2P Architecture:** Crystal clear audio via WebRTC Mesh.
- 🖥️ **Screen Sharing:** Cinema mode with System Audio support.
- 🗳️ **Democracy System:** Vote Kick & IP Ban logic for moderation.
- 🔒 **Privacy First:** No database, no logs, self-hosted.
- ⚡ **Easy Setup:** Docker-ready, no complex config.
- 🇹🇷 **Localization:** Turkish UI support (English README).

---

## 🚀 Installation

### Method 1: Docker Compose (Recommended)

The easiest way to get started is using Docker.

```bash
git clone https://github.com/tahayasinkoksal/open-voice-chat.git
cd open-voice-chat
docker compose up -d
```

### Method 2: Manual (Node.js)

If you prefer running it directly with Node.js:

```bash
# Install dependencies
npm install

# Start the server
npm start
```

---

## ⚙️ Configuration

### managing Rooms
Rooms and admin passwords are managed in `config/rooms.json`.

```json
[
  {
    "name": "General",
    "password": "admin-password",
    "maxUsers": 10
  }
]
```

### Environment Variables
You can configure the port in the `.env` file (create it if it doesn't exist):

```env
PORT=3000
```

---

## ⚠️ Troubleshooting

**HTTPS Requirement:**  
Browsers require **HTTPS** for Microphone access. Use [Cloudflare Tunnel](https://www.cloudflare.com/products/tunnel/), [Nginx](https://www.nginx.com/), or test on `localhost`.

---

## 📜 Footer

**License:** MIT  
**Author:** Taha Yasin Köksal

- **Contact:** [info@tahayasinkoksal.com.tr](mailto:info@tahayasinkoksal.com.tr)
- **LinkedIn:** [linkedin.com/in/tahayasinkoksal](https://www.linkedin.com/in/tahayasinkoksal)
- **Google Play:** [Developer Profile](https://play.google.com/store/apps/dev?id=6116510173531123977)
- **Apple App Store:** [Developer Profile](https://apps.apple.com/tr/developer/taha-yasin-koksal/id1516777761)
