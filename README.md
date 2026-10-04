# 🧘 Meditation App

A tiny, beautiful meditation timer that lives in your browser. 🌿 Pick a place, pick a duration, hit **Start**, and let a slow breathing pacer and ambient soundscape do the rest. No sign-up, no install, no distractions.

### 👉 [Try it live](https://adampiron.github.io/meditation-app/)

## 💛 Why I built it

A side project born out of the limits of the Petit Bambou app. I built it on a Friday night, and it now saves me the 10€/month subscription. 😄

I use it every single day:

- 🌾 **5 min of "Meadow" right before a Deep Work session**: a great little dopamine detox that helps me unlock real focus
- 📚 **10 min of "British library" every night**: my way to reflect on the day, process emotions, step out of the noise and switch to sleep mode in minutes

## ✨ Features

- 🌍 **6 environments**: Meadow, Sunrise beach, Fireplace, Canadian forest, Tropical beach, British library
- ⏱️ **Flexible sessions**: 5, 10 or 20 minutes, or a custom length up to 3h55
- 🌬️ **Breathing pacer**: a gentle 12-second audio cycle to guide every breath
- 🎬 **Video or no video**: full-screen video backdrop, or a calm still background with a looping soundscape
- 🫥 **Zero clutter**: controls fade away when you stop moving, leaving only a thin progress bar
- ⏯️ **Your pace**: pause, resume, or stop any time (with a confirmation so you don't end by accident)
- 🌅 **Soft landing**: the ambience fades out first, then the pacer, so sessions end smoothly
- 📱 **Works everywhere**: desktop and mobile

## 🚀 Run it locally

No build step and no dependencies. Clone the repo, then start any static server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> 🎉

## 🛠️ Under the hood

- 🍦 **Vanilla HTML, CSS and JavaScript**: no framework, no bundler
- 📺 **YouTube IFrame API** for the video backgrounds
- 🔊 **Local MP3 loops** for ambience and the breathing pacer

## 📁 Project structure

- `index.html`: the three screens (landing, countdown, session)
- `app.js`: session logic, audio, video and fades
- `styles.css`: all the styling and theme tokens
- `assets/sounds/`: ambient loops and the breathing pacer
- `assets/images/`: optional background photos (see the README inside)
- `DESIGN.md`: the original design spec

## ☕ Support

Enjoying the calm? [Buy me a coffee!](https://donate.stripe.com/fZu5kFbnBex0cYC8UG9Ve02) 💛
