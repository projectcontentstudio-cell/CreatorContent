import base64
import json
import mimetypes
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8360"))
OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations"
OPENAI_IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech"
GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1/models/{model}:generateContent"
GEMINI_TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_VEO_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:predictLongRunning"
ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
MAX_SUBTITLE_CHARS = 60


def load_env_file():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()


def get_api_key():
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "replace-with-your-api-key" or not api_key.startswith("sk-"):
        return ""
    return api_key


def get_gemini_key():
    api_key = os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip()
    if not api_key or api_key.startswith("replace-with"):
        return ""
    return api_key


def get_elevenlabs_key():
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key or api_key == "replace-with-your-elevenlabs-key":
        return ""
    return api_key


def format_http_error(error):
    raw = error.read().decode("utf-8", errors="replace")
    try:
        payload = json.loads(raw)
        message = payload.get("error", {}).get("message") or raw
    except Exception:
        message = raw
    if error.code == 429:
        retry = ""
        match = re.search(r"retry in ([^.]+)", message, flags=re.IGNORECASE)
        if match:
            retry = f" Retry in {match.group(1).strip()}."
        return f"Google/API quota or rate limit reached.{retry}"
    return message


class StoryFrameHandler(BaseHTTPRequestHandler):
    server_version = "StoryFrameServer/1.0"

    def do_GET(self):
        if self.path.startswith("/api/status"):
            self.send_json({
                "ok": True,
                "hasKey": bool(get_api_key()),
                "hasGeminiKey": bool(get_gemini_key()),
                "hasElevenLabsKey": bool(get_elevenlabs_key()),
                "model": os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-1-mini"),
                "geminiTextModel": os.environ.get("GEMINI_TEXT_MODEL", "gemini-3.5-flash"),
                "geminiImageModel": os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"),
                "geminiTtsModel": os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts"),
                "elevenLabsVoiceId": os.environ.get("ELEVENLABS_VOICE_ID", ""),
                "cleanerVersion": "2026-06-05-loop-clean-v2",
            })
            return

        file_path = self.path.split("?", 1)[0].lstrip("/") or "index.html"
        safe_path = (ROOT / file_path).resolve()
        if not str(safe_path).startswith(str(ROOT)) or not safe_path.exists() or safe_path.is_dir():
            self.send_error(404, "File not found")
            return

        content_type = mimetypes.guess_type(str(safe_path))[0] or "application/octet-stream"
        payload = safe_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self):
        if self.path != "/api/generate-images":
            if self.path == "/api/generate-image":
                self.handle_generate_single_image()
                return
            if self.path == "/api/generate-script":
                self.handle_generate_script()
                return
            if self.path == "/api/regenerate-frame-script":
                self.handle_regenerate_frame_script()
                return
            if self.path == "/api/generate-voice":
                self.handle_generate_voice()
                return
            if self.path == "/api/generate-openai-voice":
                self.handle_generate_openai_voice()
                return
            if self.path == "/api/generate-gemini-voice":
                self.handle_generate_gemini_voice()
                return
            if self.path == "/api/generate-veo-video":
                self.handle_generate_veo_video()
                return
            self.send_error(404, "API endpoint not found")
            return

        body = {}
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            body = {}
        provider = normalize_provider(body.get("provider"))
        api_key = get_gemini_key() if provider == "google" else get_api_key()
        if not api_key:
            self.send_json({"ok": False, "error": f"Put your real {'GEMINI_API_KEY' if provider == 'google' else 'OPENAI_API_KEY'} in .env first."}, status=400)
            return

        try:
            prompts = build_prompts(body)
            quality = normalize_image_quality(body.get("quality"))
            size = body.get("size") or ("1024x1536" if body.get("format") == "portrait" else "1536x1024")
            model = os.environ.get("GEMINI_IMAGE_MODEL" if provider == "google" else "OPENAI_IMAGE_MODEL", "gemini-2.5-flash-image" if provider == "google" else "gpt-image-1-mini")

            images = []
            for index, prompt in enumerate(prompts):
                if provider == "google":
                    images.append(generate_gemini_image(api_key, model, prompt, body.get("format") or "portrait", quality, index))
                else:
                    images.append(generate_image(api_key, model, prompt, quality, size, index))

            self.send_json({"ok": True, "images": images})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def handle_generate_single_image(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        provider = normalize_provider(body.get("provider"))
        api_key = get_gemini_key() if provider == "google" else get_api_key()
        if not api_key:
            self.send_json({"ok": False, "error": f"Put your real {'GEMINI_API_KEY' if provider == 'google' else 'OPENAI_API_KEY'} in .env first."}, status=400)
            return

        try:
            prompts = build_prompts(body)
            index = int(body.get("index", 0))
            if index < 0 or index >= len(prompts):
                self.send_json({"ok": False, "error": "Image index is out of range."}, status=400)
                return
            quality = normalize_image_quality(body.get("quality"))
            size = body.get("size") or ("1024x1536" if body.get("format") == "portrait" else "1536x1024")
            model = os.environ.get("GEMINI_IMAGE_MODEL" if provider == "google" else "OPENAI_IMAGE_MODEL", "gemini-2.5-flash-image" if provider == "google" else "gpt-image-1-mini")
            reference_image = (body.get("referenceImage") or "").strip()
            if provider == "google":
                image = generate_gemini_image(api_key, model, prompts[index], body.get("format") or "portrait", quality, index, reference_image)
            elif reference_image:
                try:
                    image = edit_image_from_reference(api_key, model, prompts[index], reference_image, quality, size, index)
                except Exception:
                    fallback_prompt = (
                        "Continue from the scene 1 visual identity reference without copying its composition. "
                        "Preserve the same character, setting style, color palette, camera language, and story continuity, "
                        "but show a new pose, new action, and new camera angle. "
                        "This is a fallback because direct reference editing was unavailable.\n\n"
                        f"{prompts[index]}"
                    )
                    image = generate_image(api_key, model, fallback_prompt, quality, size, index)
                    image["usedReference"] = False
                    image["referenceFallback"] = True
            else:
                image = generate_image(api_key, model, prompts[index], quality, size, index)
            self.send_json({"ok": True, "image": image})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def handle_generate_script(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            provider = normalize_provider(body.get("provider"))
            api_key = get_gemini_key() if provider == "google" else get_api_key()
            if not api_key:
                self.send_json({"ok": False, "error": f"Put your real {'GEMINI_API_KEY' if provider == 'google' else 'OPENAI_API_KEY'} in .env first."}, status=400)
                return
            title = (body.get("title") or "A 24 Second Story").strip()
            description = (body.get("description") or "").strip()
            niche = (body.get("niche") or "").strip()
            language = body.get("language") or "english"
            frame_count = int(body.get("frameCount", 4) or 4)
            script = generate_script(api_key, title, description, language, niche, provider, frame_count)
            self.send_json({"ok": True, **script})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def handle_generate_veo_video(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            api_key = get_gemini_key()
            if not api_key:
                self.send_json({"ok": False, "error": "Put GEMINI_API_KEY in .env first for Veo."}, status=400)
                return
            model = os.environ.get("VEO_MODEL", "veo-3.1-fast-generate-preview")
            prompt = (
                "Create an 8-second vertical affiliate product video with natural motion.\n"
                f"Title: {body.get('title') or 'Affiliate product video'}.\n"
                f"Product direction: {body.get('description') or 'Show product benefit and desire.'}\n"
                "Make the product clear and attractive. Smooth push-in camera, TikTok-ready, no text overlay, no watermark."
            )
            instance = {"prompt": prompt}
            image_b64 = re.sub(r"^data:[^,]+,", "", body.get("image") or "").strip()
            if image_b64:
                instance["image"] = {
                    "bytesBase64Encoded": image_b64,
                    "mimeType": body.get("mime") or "image/png",
                }
            payload = {
                "instances": [instance],
                "parameters": {
                    "aspectRatio": body.get("aspectRatio") or "9:16",
                    "durationSeconds": 8,
                    "generateAudio": True,
                    "sampleCount": 1,
                },
            }
            request = Request(
                GEMINI_VEO_URL.format(model=model),
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "x-goog-api-key": api_key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urlopen(request, timeout=60) as response:
                operation = json.loads(response.read().decode("utf-8"))
            self.send_json({"ok": True, "operationName": operation.get("name", ""), "done": False, "videoUrl": ""})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def handle_regenerate_frame_script(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            provider = normalize_provider(body.get("provider"))
            api_key = get_gemini_key() if provider == "google" else get_api_key()
            if not api_key:
                self.send_json({"ok": False, "error": f"Put your real {'GEMINI_API_KEY' if provider == 'google' else 'OPENAI_API_KEY'} in .env first."}, status=400)
                return
            title = (body.get("title") or "A 24 Second Story").strip()
            description = (body.get("description") or "").strip()
            niche = (body.get("niche") or "").strip()
            language = body.get("language") or "english"
            index = int(body.get("index", 0))
            frames = body.get("frames") or []
            line = regenerate_frame_script(api_key, title, description, language, index, frames, niche, provider)
            self.send_json({"ok": True, "line": line})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def handle_generate_voice(self):
        api_key = get_elevenlabs_key()
        if not api_key:
            self.send_json({"ok": False, "error": "Put your real ELEVENLABS_API_KEY in .env first."}, status=400)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            text = (body.get("text") or "").strip()
            if not text:
                self.send_json({"ok": False, "error": "Voice text is empty."}, status=400)
                return
            audio = generate_elevenlabs_voice(api_key, text, body.get("style") or "warm")
            self.send_json({"ok": True, **audio})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def handle_generate_openai_voice(self):
        api_key = get_api_key()
        if not api_key:
            self.send_json({"ok": False, "error": "Put your real OPENAI_API_KEY in .env first."}, status=400)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            text = (body.get("text") or "").strip()
            if not text:
                self.send_json({"ok": False, "error": "Voice text is empty."}, status=400)
                return
            audio = generate_openai_voice(api_key, text, body.get("style") or "warm", body.get("language") or "malay")
            self.send_json({"ok": True, **audio})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def handle_generate_gemini_voice(self):
        api_key = get_gemini_key()
        if not api_key:
            self.send_json({"ok": False, "error": "Put your real GEMINI_API_KEY in .env first."}, status=400)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            text = (body.get("text") or "").strip()
            if not text:
                self.send_json({"ok": False, "error": "Voice text is empty."}, status=400)
                return
            audio = generate_gemini_voice(api_key, text, body.get("style") or "warm", body.get("language") or "malay", body.get("voiceName") or "")
            self.send_json({"ok": True, **audio})
        except HTTPError as error:
            detail = format_http_error(error)
            self.send_json({"ok": False, "error": detail}, status=error.code)
        except (URLError, TimeoutError) as error:
            self.send_json({"ok": False, "error": f"Network error: {error}"}, status=502)
        except Exception as error:
            self.send_json({"ok": False, "error": str(error)}, status=500)

    def send_json(self, payload, status=200):
        if isinstance(payload, dict) and isinstance(payload.get("frames"), list):
            payload = dict(payload)
            payload["frames"] = clean_story_frames(payload["frames"], "malay")
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))


def build_prompts(body):
    idea = (body.get("idea") or "A cinematic short story with a hopeful ending").strip()
    title = (body.get("title") or "A 24 Second Story").strip()
    niche = (body.get("niche") or "General").strip()
    mode = (body.get("mode") or "story").strip().lower()
    subtitles = body.get("subtitles") or []
    video_format = body.get("format") or "portrait"
    language = body.get("language") or "english"
    motion = body.get("motion") or "auto"
    quality = normalize_image_quality(body.get("quality"))
    aspect = "vertical portrait 9:16" if video_format == "portrait" else "wide landscape 16:9"
    language_label = "Malay" if language == "malay" else "English"
    frame_count = int(body.get("frameCount", 4) or 4)
    arc = ["opening hook/setup", "problem or discovery", "choice or action", "visual payoff/ending"]
    prompts = []

    for index in range(frame_count):
        beat = subtitles[index] if index < len(subtitles) and subtitles[index] else f"Scene {index + 1} of the story"
        camera_note = build_camera_note(motion, index)
        if mode == "affiliate":
            if index == 0:
                scene_role = (
                    "Scene role: Problem scene. Show a relatable daily pain before using the product. "
                    "Keep it natural, not a hard sell. The product may appear subtly only if it helps continuity."
                )
            else:
                scene_role = (
                    "Scene role: Solution scene. Show the uploaded product clearly as the simple way out. "
                    "Keep the product central, desirable, and accurate."
                )
            prompts.append(
                "Create one premium affiliate product image for a short product video.\n"
                "ABSOLUTE TEXT BAN: the generated picture must contain zero readable text of any kind.\n"
                f"Title/product angle: {title}\n"
                f"Product direction: {idea}\n"
                f"Frame: {index + 1} of {frame_count}\n"
                f"{scene_role}\n"
                f"Spoken sales narration context, never visible in image: {beat}\n"
                f"Aspect and framing: {aspect}; keep the product clear and leave clean lower space for subtitles.\n"
                "Use the uploaded product reference if provided. Preserve product shape, color, packaging, logo, and label when visible.\n"
                f"Camera direction: {camera_note}\n"
                f"Quality direction: {build_quality_note(quality)}\n"
                "Final hard rule: no typography, no extra letters, no captions, no subtitles, no signs, no watermark, no extra logo beyond the real product label."
            )
            continue
        prompts.append(
            "Create one cinematic storyboard frame for a connected image-to-video story.\n"
            "ABSOLUTE TEXT BAN: the generated picture must contain zero readable text of any kind.\n"
            f"Title: {title}\n"
            f"Content niche: {niche}\n"
            f"Story idea: {idea}\n"
            f"Frame: {index + 1} of {frame_count}\n"
            f"Story function: {arc[index] if index < len(arc) else 'story continuation'}\n"
            f"Spoken narration context ({language_label}, never visible in image): {beat}\n"
            f"Full {frame_count}-frame spoken script for continuity only, never visible text: {' / '.join(str(item) for item in subtitles[:frame_count])}\n"
            f"Reference plan: Frame 1 establishes the character and world. Frame {index + 1} must continue that same film.\n"
            f"Aspect and framing: {aspect}; keep the subject fully visible and leave clean lower space for later subtitle overlay.\n"
            "Continuity: keep the same main characters, location style, colors, and visual identity from frame to frame.\n"
            "Story progression: this frame must show a new story action, changed pose, changed camera angle, "
            "and a clear before/after difference from earlier frames. Do not repeat the same composition.\n"
            f"Camera direction: {camera_note}\n"
            "Composition: cinematic storytelling moment, clear action, expressive face/body language, "
            "strong foreground/background depth, dynamic lighting, and a clear before/after story feeling.\n"
            f"Quality direction: {build_quality_note(quality)}\n"
            "Avoid random poster art. Make this look like one scene from the same short film.\n"
            "Final hard rule: no typography, no letters, no words, no captions, no subtitles, no signs, "
            "no watermark, no logo, and no UI inside the image. Subtitles are added later in the video renderer."
        )

    return prompts


def build_camera_note(motion, index):
    if motion == "zoom-in":
        return "use a strong subject-focused composition that works with a slow push-in."
    if motion == "zoom-out":
        return "use a wider composition that reveals the environment and works with a gentle pull-back."
    if motion == "pan":
        return "use layered foreground and background depth that works with a lateral pan."
    if motion == "cinematic":
        return "use a dramatic cut-ready angle with strong silhouette, depth, and clear action."
    auto_notes = [
        "choose the best establishing camera angle for the opening setup.",
        "choose the best tension-building angle with visible discovery or danger.",
        "choose the best action angle with movement, urgency, and readable body language.",
        "choose the best emotional ending angle with resolution and atmosphere.",
    ]
    return auto_notes[index % len(auto_notes)]


def build_quality_note(quality):
    if quality == "low":
        return (
            "prioritize sharp subject, clean anatomy, realistic cinematic lighting, detailed face, "
            "clear focal point, high contrast, crisp edges, natural lens depth, and polished film still quality. "
            "Avoid blurry, muddy, sketchy, painterly, low-detail, distorted, or unfinished rendering."
        )
    if quality == "medium":
        return "use high-detail cinematic realism with sharp focus, rich texture, and polished lighting."
    return "use premium cinematic realism with very sharp focus, detailed texture, natural lighting, and refined composition."


def normalize_provider(provider):
    return "google" if str(provider or "").lower() == "google" else "openai"


def generate_image(api_key, model, prompt, quality, size, index):
    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "quality": quality,
        "size": size,
        "output_format": "png",
    }
    request = Request(
        OPENAI_IMAGE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=180) as response:
        data = json.loads(response.read().decode("utf-8"))

    image_base64 = data["data"][0]["b64_json"]
    base64.b64decode(image_base64)
    return {
        "name": f"AI frame {index + 1}",
        "mime": "image/png",
        "b64": image_base64,
        "prompt": prompt,
        "usage": data.get("usage"),
        "usedReference": False,
    }


def generate_gemini_image(api_key, model, prompt, video_format, quality, index, reference_b64=""):
    aspect_ratio = "vertical 9:16 portrait" if video_format == "portrait" else "wide 16:9 landscape"
    parts = [{"text": f"{prompt}\n\nOutput must be a {aspect_ratio} image."}]
    if reference_b64:
        parts.append({
            "inline_data": {
                "mime_type": "image/png",
                "data": reference_b64,
            }
        })
    payload = {
        "contents": [{"parts": parts}]
    }

    request = Request(
        GEMINI_GENERATE_URL.format(model=model),
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=180) as response:
        data = json.loads(response.read().decode("utf-8"))

    image = extract_gemini_image(data)
    return {
        "name": f"Google frame {index + 1}",
        "mime": image["mime"],
        "b64": image["b64"],
        "prompt": prompt,
        "usage": data.get("usageMetadata"),
        "usedReference": bool(reference_b64),
    }


def edit_image_from_reference(api_key, model, prompt, reference_b64, quality, size, index):
    image_bytes = base64.b64decode(reference_b64)
    edit_prompt = (
        "Use the provided reference image as the exact visual identity reference.\n"
        "Preserve the same main character, face/body design, outfit, color palette, art style, lighting language, "
        "and world design. Use the reference for identity only, not for composition.\n"
        "Create the NEXT story moment with a different pose, different camera angle, different action, "
        "and visible story progression. Do not copy the reference image layout or make a near-duplicate.\n"
        "Do not add any text, letters, captions, subtitles, signs, watermark, UI, or logo. "
        "Subtitles are added later in the video renderer only.\n\n"
        f"{prompt}"
    )
    fields = {
        "model": model,
        "prompt": edit_prompt,
        "n": "1",
        "quality": quality,
        "size": size,
        "output_format": "png",
    }
    files = {
        "image": (f"scene-{index}-reference.png", image_bytes, "image/png")
    }
    body, content_type = encode_multipart(fields, files)
    request = Request(
        OPENAI_IMAGE_EDIT_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": content_type,
        },
        method="POST",
    )
    with urlopen(request, timeout=180) as response:
        data = json.loads(response.read().decode("utf-8"))

    image_base64 = data["data"][0]["b64_json"]
    base64.b64decode(image_base64)
    return {
        "name": f"AI frame {index + 1}",
        "mime": "image/png",
        "b64": image_base64,
        "prompt": edit_prompt,
        "usage": data.get("usage"),
        "usedReference": True,
    }


def encode_multipart(fields, files):
    boundary = "----StoryFrameBoundary" + base64.urlsafe_b64encode(os.urandom(12)).decode("ascii")
    chunks = []
    for name, value in fields.items():
        chunks.append(f"--{boundary}\r\n".encode("utf-8"))
        chunks.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        chunks.append(str(value).encode("utf-8"))
        chunks.append(b"\r\n")
    for name, (filename, data, content_type) in files.items():
        chunks.append(f"--{boundary}\r\n".encode("utf-8"))
        chunks.append(
            f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        chunks.append(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        chunks.append(data)
        chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def generate_elevenlabs_voice(api_key, text, style):
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb").strip()
    model_id = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2").strip()
    stability = 0.48
    similarity = 0.78
    style_value = 0.12
    if style == "bright":
        stability = 0.38
        style_value = 0.32
    elif style == "calm":
        stability = 0.68
        style_value = 0.05

    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity,
            "style": style_value,
            "use_speaker_boost": True,
        },
    }
    url = ELEVENLABS_TTS_URL.format(voice_id=voice_id)
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urlopen(request, timeout=120) as response:
        audio_bytes = response.read()

    return {
        "mime": "audio/mpeg",
        "b64": base64.b64encode(audio_bytes).decode("ascii"),
        "voiceId": voice_id,
        "modelId": model_id,
    }


def generate_openai_voice(api_key, text, style, language):
    voice = os.environ.get("OPENAI_VOICE", "coral").strip() or "coral"
    model = os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts").strip() or "gpt-4o-mini-tts"
    tone = {
        "bright": "Speak with clear, energetic narration for a short social video.",
        "calm": "Speak slowly with calm, warm storytelling emotion.",
        "warm": "Speak with warm cinematic storytelling emotion.",
    }.get(style, "Speak with warm cinematic storytelling emotion.")
    language_note = "Use natural Malay pronunciation." if language == "malay" else "Use natural English pronunciation."
    payload = {
        "model": model,
        "voice": voice,
        "input": text,
        "instructions": f"{language_note} {tone} Keep the pacing within five seconds.",
        "response_format": "mp3",
    }
    request = Request(
        OPENAI_SPEECH_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urlopen(request, timeout=120) as response:
        audio_bytes = response.read()

    return {
        "mime": "audio/mpeg",
        "b64": base64.b64encode(audio_bytes).decode("ascii"),
        "voiceId": voice,
        "modelId": model,
    }


def generate_gemini_voice(api_key, text, style, language, voice_name=""):
    model = os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts").strip() or "gemini-2.5-flash-preview-tts"
    voice_name = (voice_name or os.environ.get("GEMINI_TTS_VOICE", "Zephyr")).strip() or "Zephyr"
    tone = {
        "bright": "Say in a clear, energetic social video narration voice",
        "calm": "Say slowly in a calm, gentle storytelling voice",
        "warm": "Say in a warm cinematic storytelling voice",
    }.get(style, "Say in a warm cinematic storytelling voice")
    language_note = "Use natural Malay pronunciation." if language == "malay" else "Use natural English pronunciation."
    prompt = f"{tone}. {language_note} Read exactly this line and do not add words: {text}"
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_name
                    }
                }
            }
        },
        "model": model,
    }
    request = Request(
        GEMINI_TTS_URL.format(model=model),
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=120) as response:
        data = json.loads(response.read().decode("utf-8"))

    pcm_b64 = extract_gemini_audio(data)
    pcm_bytes = base64.b64decode(pcm_b64)
    wav_bytes = pcm_to_wav(pcm_bytes)
    return {
        "mime": "audio/wav",
        "b64": base64.b64encode(wav_bytes).decode("ascii"),
        "voiceId": voice_name,
        "modelId": model,
    }


def generate_script(api_key, title, description, language, niche="", provider="openai", frame_count=4):
    model = os.environ.get("GEMINI_TEXT_MODEL" if provider == "google" else "OPENAI_TEXT_MODEL", "gemini-3.5-flash" if provider == "google" else "gpt-4.1-mini")
    language_name = "Malay" if language == "malay" else "English"
    expected_frame_count = frame_count
    if "Mode: Affiliate Video" in description or "Mode: Affiliate Product MVP" in description:
        expected_frame_count = 2
        prompt = (
            "Create a TikTok affiliate product MVP script for exactly 2 frames.\n"
            "Return ONLY valid JSON with this shape:\n"
            '{"title":"string","description":"string","frames":["problem","solution plus CTA"]}\n'
            "Rules:\n"
            f"- Write every narration line in {language_name} only.\n"
            "- Frame 1 is a relatable problem or pain, not a hard sell.\n"
            "- Frame 2 presents the product as solution and includes a short CTA.\n"
            "- Each line must be 60 characters or fewer and complete.\n"
            "- No exaggerated medical, financial, or guaranteed claims.\n"
            "- No numbering. No markdown.\n\n"
            f"Affiliate brief: {description}\n"
            f"Title: {title}"
        )
    else:
        prompt = (
        f"Create a short image-to-video narration for exactly {frame_count} frames.\n"
        f"The final video has {frame_count} frames. Each frame duration will follow that frame's voice length.\n"
        "Return ONLY valid JSON with this shape:\n"
        '{"title":"string","description":"string","frames":["opening narration","problem narration","choice narration","ending narration"]}\n'
        "Rules:\n"
        f"- Write every narration line in {language_name} only.\n"
        f"- The {frame_count} lines must read like one continuous storytelling narration, not separate captions.\n"
        "- Each line must continue naturally from the previous line.\n"
        "- The script must match the user's title and description closely.\n"
        "- Respect the selected niche and make the hook feel native to that niche.\n"
        "- Do not invent a different topic, character, location, or ending.\n"
        f"- Use a continuous {frame_count}-beat arc: strong hook/setup, discovery, escalation, choice/action, payoff, and ending.\n"
        f"- Keep the same main character and visual setting across all {frame_count} frames.\n"
        "- Each frame line must be natural spoken narration for one image only.\n"
        "- Each line must be 60 characters or fewer, including spaces and punctuation.\n"
        "- Prefer 7 to 12 words per line.\n"
        "- Do not add filler words just to reach a word count.\n"
        "- Every line must be a complete sentence.\n"
        "- Avoid repeated endings like 'dengan penuh', 'dengan penuh harapan', or 'with quiet hope'.\n"
        "- Use simple words that are easy to read aloud quickly.\n"
        f"- Make the story clear from frame 1 to frame {frame_count}.\n"
        "- Use vivid, visual scenes that are easy to generate as images.\n"
        "- Return a concise cinematic description that can guide image generation.\n"
        "- If the user description is empty, create a clear description from the title and story arc.\n"
        "- No numbering inside the subtitles.\n"
        "- No markdown.\n\n"
        f"User title: {title}\n"
        f"Selected niche: {niche or 'General'}\n"
        f"User description: {description or 'Use the title, but do not change the core topic.'}"
        )
    if provider == "google":
        data = gemini_generate_text(api_key, model, prompt, 0.8)
        text = extract_gemini_text(data)
        usage = data.get("usageMetadata")
    else:
        payload = {
            "model": model,
            "input": prompt,
            "temperature": 0.8,
        }
        request = Request(
            OPENAI_RESPONSES_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
        text = extract_response_text(data)
        usage = data.get("usage")
    parsed = parse_json_object(text)
    frames = parsed.get("frames") or []
    if len(frames) != expected_frame_count:
        raise ValueError(f"{'Google Gemini' if provider == 'google' else 'OpenAI'} did not return exactly {expected_frame_count} frame subtitles.")
    return {
        "title": title,
        "description": description or parsed.get("description") or title,
        "frames": clean_story_frames(frames[:expected_frame_count], language),
        "usage": usage,
    }


def regenerate_frame_script(api_key, title, description, language, index, frames, niche="", provider="openai"):
    model = os.environ.get("GEMINI_TEXT_MODEL" if provider == "google" else "OPENAI_TEXT_MODEL", "gemini-3.5-flash" if provider == "google" else "gpt-4.1-mini")
    language_name = "Malay" if language == "malay" else "English"
    current_script = " / ".join(str(item) for item in frames[:4])
    prompt = (
        "Rewrite exactly one narration line for a short image-to-video story.\n"
        "Return ONLY valid JSON with this shape: {\"line\":\"string\"}\n"
        "Rules:\n"
        f"- Write in {language_name} only.\n"
        "- Keep it as one complete spoken sentence.\n"
        "- Keep it 60 characters or fewer, including spaces and punctuation.\n"
        "- It is voiced only for this one frame.\n"
        "- Prefer 7 to 12 words.\n"
        "- Do not add filler words.\n"
        "- Do not use repeated endings like 'dengan penuh', 'dengan penuh harapan', or 'with quiet hope'.\n"
        "- It must continue naturally with the other frame lines.\n"
        "- No numbering. No markdown.\n\n"
        f"Title: {title}\n"
        f"Selected niche: {niche or 'General'}\n"
        f"Description: {description}\n"
        f"Frame to rewrite: {index + 1} of {len(frames[:4]) or 4}\n"
        f"Current script: {current_script}"
    )
    if provider == "google":
        data = gemini_generate_text(api_key, model, prompt, 0.8)
        text = extract_gemini_text(data)
    else:
        payload = {
            "model": model,
            "input": prompt,
            "temperature": 0.8,
        }
        request = Request(
            OPENAI_RESPONSES_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(request, timeout=90) as response:
            data = json.loads(response.read().decode("utf-8"))
        text = extract_response_text(data)
    parsed = parse_json_object(text)
    return fit_storytelling_line(str(parsed.get("line") or ""), language)


def clean_story_frames(frames, language):
    return [fit_storytelling_line(str(frame), language) for frame in frames]


def fit_storytelling_line(text, language):
    line = re.sub(r"\s+", " ", text.strip().replace("\n", " "))
    junk_patterns = [
        r"([.!?])\s+dengan(?:\s+penuh)?(?:\s+harapan)?(?:\s+baru)?\.?$",
        r"([.!?])\s+with(?:\s+quiet)?(?:\s+hope)?(?:\s+again)?\.?$",
        r"\s+dengan(?:\s+penuh)?(?:\s+harapan)?(?:\s+baru)?\.?$",
        r"\s+with(?:\s+quiet)?(?:\s+hope)?(?:\s+again)?\.?$",
        r"\s+baru\.?$",
    ]
    previous = None
    while previous != line:
        previous = line
        for pattern in junk_patterns:
            line = re.sub(pattern, lambda match: match.group(1) if match.lastindex else ".", line, flags=re.IGNORECASE)
        line = re.sub(r"\.{2,}", ".", line)
        line = re.sub(r"\s+\.", ".", line).strip().rstrip(",;:")
    if not line.endswith((".", "!", "?")):
        line += "."
    return limit_subtitle_characters(line)


def limit_subtitle_characters(text):
    line = re.sub(r"\s+", " ", text.strip())
    if len(line) <= MAX_SUBTITLE_CHARS:
        return line
    words = re.sub(r"[.!?]+$", "", line).split(" ")
    result = ""
    for word in words:
        candidate = f"{result} {word}".strip()
        if len(candidate + ".") <= MAX_SUBTITLE_CHARS:
            result = candidate
    if result:
        return result.rstrip(",;:") + "."
    return line[:MAX_SUBTITLE_CHARS - 1].rstrip(",;: ") + "."


def normalize_image_quality(value):
    quality = (value or "medium").strip().lower()
    return quality if quality in {"low", "medium", "high"} else "medium"


def gemini_generate_text(api_key, model, prompt, temperature):
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": temperature,
        },
    }
    request = Request(
        GEMINI_GENERATE_URL.format(model=model),
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def extract_gemini_text(data):
    parts = []
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if part.get("text"):
                parts.append(part["text"])
    text = "\n".join(parts).strip()
    if not text:
        raise ValueError("No text returned from Google Gemini.")
    return text


def extract_gemini_image(data):
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline_data = part.get("inlineData") or part.get("inline_data")
            if inline_data and inline_data.get("data"):
                image_base64 = inline_data["data"]
                base64.b64decode(image_base64)
                return {
                    "mime": inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png",
                    "b64": image_base64,
                }
    raise ValueError("Google Gemini did not return image data.")


def extract_gemini_audio(data):
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline_data = part.get("inlineData") or part.get("inline_data")
            if inline_data and inline_data.get("data"):
                return inline_data["data"]
    raise ValueError("Google Gemini did not return audio data.")


def pcm_to_wav(pcm_bytes, sample_rate=24000, channels=1, sample_width=2):
    byte_rate = sample_rate * channels * sample_width
    block_align = channels * sample_width
    data_size = len(pcm_bytes)
    header = b"".join([
        b"RIFF",
        (36 + data_size).to_bytes(4, "little"),
        b"WAVE",
        b"fmt ",
        (16).to_bytes(4, "little"),
        (1).to_bytes(2, "little"),
        channels.to_bytes(2, "little"),
        sample_rate.to_bytes(4, "little"),
        byte_rate.to_bytes(4, "little"),
        block_align.to_bytes(2, "little"),
        (sample_width * 8).to_bytes(2, "little"),
        b"data",
        data_size.to_bytes(4, "little"),
    ])
    return header + pcm_bytes


def extract_response_text(data):
    if data.get("output_text"):
        return data["output_text"]
    parts = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in ("output_text", "text"):
                parts.append(content.get("text", ""))
    text = "\n".join(parts).strip()
    if not text:
        raise ValueError("No text returned from OpenAI.")
    return text


def parse_json_object(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(text[start:end + 1])


if __name__ == "__main__":
    print(f"StoryFrame Studio running at http://localhost:{PORT}/")
    print("API key loaded:", "yes" if get_api_key() else "no")
    ThreadingHTTPServer(("localhost", PORT), StoryFrameHandler).serve_forever()
