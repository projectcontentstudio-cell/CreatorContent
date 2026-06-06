# StoryFrame Studio

Local faceless short-video generator prototype.

Current flow:

1. Choose a niche.
2. Enter a title and optional description.
3. Generate a 4-frame script with Gemini.
4. Review ChatGPT image prompts in a popup, then copy them.
5. Upload 4 images manually as the video frames.
6. Generate or preview narration with ElevenLabs voice.
7. Preview and export a short MP4/WebM video with subtitles.

## Files

- `index.html` - app layout
- `style.css` - UI styling
- `app.js` - browser app logic, rendering, preview, export
- `server.py` - local API server and Gemini/OpenAI/ElevenLabs calls
- `.env.example` - safe environment template

The real `.env` is not included in the zip because it contains API keys.

## Setup

1. Install Python 3.10+.
2. Copy `.env.example` to `.env`.
3. Put your Gemini key in:

```env
GEMINI_API_KEY=your-google-gemini-api-key-here
```

4. Start the server:

```bash
python server.py
```

5. Open:

```text
http://localhost:8360/
```

## Gemini Models

Default Gemini config:

```env
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE=Zephyr
```

Text was tested successfully with Gemini. Image generation is intentionally hidden in the current UI; users upload 4 images manually. Voice provider now defaults to ElevenLabs, so a real `ELEVENLABS_API_KEY` is required for production voice.

## Important Notes

- The app is currently set to 4 frames with manual image upload.
- Gemini voice has 10 selectable voice types in the UI.
- Voice provider defaults to ElevenLabs.
- The ChatGPT image prompt button opens a review popup before copying.
- AI provider defaults to Google.
- OpenAI and ElevenLabs are optional fallback providers.
- Browser voice is available as a fallback preview/export tone mode.

## Safe Packaging

Do not share `.env` publicly. Share `.env.example` instead.

Generated screenshots/tests in `outputs/` and temporary files in `work/` are not required to run the app.
