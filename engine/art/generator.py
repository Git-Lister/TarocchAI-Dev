# engine/art/generator.py
# Full upgrade for TarocchAI – reliable, multi-style, retry-capable tarot deck generation

import glob
import json
import os
import random
import time
import urllib.error
import urllib.request
from typing import Any

# ----------------------------------------------------------------------
# CONFIGURATION
# ----------------------------------------------------------------------

COMFY_URL = os.getenv("COMFY_URL", "http://127.0.0.1:8188")
OUTPUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "static", "img", "cards"
)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ComfyUI API endpoints
API_QUEUE = f"{COMFY_URL}/prompt"
API_HISTORY = f"{COMFY_URL}/history"
API_VIEW = f"{COMFY_URL}/view"

# ----------------------------------------------------------------------
# STYLE PRESETS
# ----------------------------------------------------------------------

STYLE_PRESETS = {
    "medieval": {
        "checkpoint": "realvisxlV40_v40Bakedvae.safetensors",
        "lora": "tarot_medieval.safetensors",
        "lora_strength_model": 0.7,
        "lora_strength_clip": 0.7,
        "steps": 30,
        "cfg": 6.5,
        "sampler": "dpmpp_2m",
        "scheduler": "karras",
        "denoise": 1.0,
        "width": 896,
        "height": 1254,
        "style_desc": "medieval woodcut, Albrecht Dürer engraving style, heavy ink lines, crosshatching",
        "use_face_detailer": True,
        "use_upscale": False,
    },
    "pulp": {
        "checkpoint": "realvisxlV40_v40Bakedvae.safetensors",
        "lora": "pulp_magazine.safetensors",
        "lora_strength_model": 0.8,
        "lora_strength_clip": 0.8,
        "steps": 35,
        "cfg": 7.0,
        "sampler": "dpmpp_2m",
        "scheduler": "karras",
        "denoise": 1.0,
        "width": 896,
        "height": 1254,
        "style_desc": "vintage pulp magazine cover, dramatic shadows, bold psychedelic colors",
        "use_face_detailer": True,
        "use_upscale": False,
    },
    "flux_fast": {
        "checkpoint": "flux1-schnell-fp8.safetensors",
        "lora": None,
        "lora_strength_model": 0.0,
        "lora_strength_clip": 0.0,
        "steps": 4,
        "cfg": 1.0,
        "sampler": "euler",
        "scheduler": "simple",
        "denoise": 1.0,
        "width": 512,
        "height": 768,
        "style_desc": "fast generation with Flux Schnell",
        "use_face_detailer": False,
        "use_upscale": False,
    },
}

# ----------------------------------------------------------------------
# PROMPT TEMPLATE
# ----------------------------------------------------------------------

CARD_PROMPT_TEMPLATE = (
    'tarot card "{card_name}", {style_description}, '
    "featuring {character_description}, "
    "medieval woodcut, heavy ink lines, crosshatching, halftone dots, "
    "distressed silkscreen texture, sickly yellowed parchment, "
    "Albrecht Dürer engraving style, Frank Frazetta anatomy, "
    "Richard Corben grotesquery, gothic ruined architecture, "
    "toxic neon highlights (cyan, magenta, vermilion), "
    "dark moody lighting, no text, no signature"
)

# ----------------------------------------------------------------------
# UTILITY FUNCTIONS
# ----------------------------------------------------------------------


def sanitize_filename(name: str) -> str:
    """Convert card name to a safe filename."""
    safe = "".join(c for c in name if c.isalnum() or c in (" ", "-", "_"))
    safe = safe.replace(" ", "_")
    safe = safe.lower()
    return f"{safe}.png"


def build_workflow(
    card_name: str,
    style: str = "medieval",
    seed: int = 42,
    character_description: str = "",
) -> dict[str, Any]:
    """
    Build a complete ComfyUI workflow JSON based on the selected style preset.
    Returns a dict that can be sent to the /prompt endpoint.
    """
    preset = STYLE_PRESETS.get(style, STYLE_PRESETS["medieval"])

    # Build the prompt
    prompt_text = CARD_PROMPT_TEMPLATE.format(
        card_name=card_name,
        style_description=preset["style_desc"],
        character_description=character_description or "a mysterious figure",
    )
    negative_prompt = (
        "lowres, bad anatomy, bad hands, disfigured, deformed, extra limbs, "
        "blurry, out of frame, watermark, text, signature, modern, photorealistic, "
        "cgi, 3d render, cartoon, anime"
    )

    # Node definitions (IDs are sequential integers)
    nodes: dict[str, Any] = {}

    # Node 1: Load Checkpoint
    nodes["1"] = {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {"ckpt_name": preset["checkpoint"]},
    }

    # Node 2: Load LoRA (if provided)
    lora_out_model = "1"
    lora_out_clip = "1"
    if preset.get("lora"):
        nodes["2"] = {
            "class_type": "LoraLoader",
            "inputs": {
                "model": ["1", 0],
                "clip": ["1", 1],
                "lora_name": preset["lora"],
                "strength_model": preset.get("lora_strength_model", 0.7),
                "strength_clip": preset.get("lora_strength_clip", 0.7),
            },
        }
        lora_out_model = "2"
        lora_out_clip = "2"
    else:
        # If no LoRA, use checkpoint outputs directly
        lora_out_model = "1"
        lora_out_clip = "1"

    # Node 3: CLIP Text Encode (Positive)
    nodes["3"] = {
        "class_type": "CLIPTextEncode",
        "inputs": {"text": prompt_text, "clip": [lora_out_clip, 1]},
    }

    # Node 4: CLIP Text Encode (Negative)
    nodes["4"] = {
        "class_type": "CLIPTextEncode",
        "inputs": {"text": negative_prompt, "clip": [lora_out_clip, 1]},
    }

    # Node 5: Empty Latent Image
    nodes["5"] = {
        "class_type": "EmptyLatentImage",
        "inputs": {
            "width": preset["width"],
            "height": preset["height"],
            "batch_size": 1,
        },
    }

    # Node 6: KSampler
    nodes["6"] = {
        "class_type": "KSampler",
        "inputs": {
            "model": [lora_out_model, 0],
            "positive": ["3", 0],
            "negative": ["4", 0],
            "latent_image": ["5", 0],
            "seed": seed,
            "steps": preset["steps"],
            "cfg": preset["cfg"],
            "sampler_name": preset["sampler"],
            "scheduler": preset["scheduler"],
            "denoise": preset["denoise"],
        },
    }

    # Node 7: VAE Decode
    nodes["7"] = {
        "class_type": "VAEDecode",
        "inputs": {"samples": ["6", 0], "vae": ["1", 2]},
    }

    # Node 8: Save Image (with prefix)
    nodes["8"] = {
        "class_type": "SaveImage",
        "inputs": {
            "images": ["7", 0],
            "filename_prefix": f"tarot_{sanitize_filename(card_name)}",
        },
    }

    # Optional: FaceDetailer (if preset enables it and node is installed)
    if preset.get("use_face_detailer", False):
        nodes["9"] = {
            "class_type": "DZFaceDetailer",
            "inputs": {
                "image": ["7", 0],
                "model": [lora_out_model, 0],
                "clip": [lora_out_clip, 1],
                "vae": ["1", 2],
                "positive": ["3", 0],
                "negative": ["4", 0],
                "seed": seed,
                "steps": 15,
                "cfg": preset["cfg"],
                "sampler_name": preset["sampler"],
                "scheduler": preset["scheduler"],
                "denoise": 0.32,
                "mask_blur": 4,
                "mask_type": "face",
                "mask_control": "dilate",
                "dilate_mask_value": 5,
                "erode_mask_value": 3,
                "guide_size": 768,
            },
        }
        # Update SaveImage to take from FaceDetailer
        nodes["8"]["inputs"]["images"] = ["9", 0]

    # Optional: Ultimate SD Upscale (if preset enables it)
    if preset.get("use_upscale", False):
        # Placeholder for future upscale integration
        pass

    # Build the final workflow dict
    workflow = {
        "id": str(int(time.time() * 1000)),
        "prompt": nodes,
    }
    return workflow


# ----------------------------------------------------------------------
# COMFYUI API COMMUNICATION
# ----------------------------------------------------------------------


def queue_prompt(workflow: dict[str, Any], timeout: int = 30) -> str:
    """Send workflow to ComfyUI and return prompt_id."""
    data = json.dumps(workflow).encode("utf-8")
    req = urllib.request.Request(
        API_QUEUE, data=data, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            resp = json.loads(response.read().decode("utf-8"))
            prompt_id = resp.get("prompt_id")
            if not prompt_id:
                raise RuntimeError("No prompt_id in response")
            return prompt_id
    except urllib.error.URLError as e:
        raise RuntimeError(f"ComfyUI queue error: {e}") from e


def queue_prompt_with_retry(
    workflow: dict[str, Any], max_retries: int = 3, timeout: int = 30
) -> str:
    """Queue a workflow with exponential backoff retries."""
    for attempt in range(max_retries):
        try:
            return queue_prompt(workflow, timeout)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            wait = 2**attempt
            print(f"[Retry {attempt + 1}/{max_retries}] {e}, waiting {wait}s...")
            time.sleep(wait)
    raise RuntimeError("Max retries exceeded")


def get_history(prompt_id: str, timeout: int = 30) -> dict[str, Any] | None:
    """Fetch ComfyUI history for a given prompt_id."""
    url = f"{API_HISTORY}/{prompt_id}"
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError:
        return None


def get_image_bytes_from_history(prompt_id: str, timeout: int = 30) -> bytes | None:
    """Attempt to retrieve the generated image using the history endpoint."""
    history = get_history(prompt_id, timeout)
    if not history:
        return None

    data = history.get(prompt_id)
    if not data:
        return None

    outputs = data.get("outputs", {})
    for node_output in outputs.values():
        images = node_output.get("images", [])
        if not images:
            continue

        img_info = images[0]
        filename = img_info["filename"]
        subfolder = img_info.get("subfolder", "")
        view_url = f"{API_VIEW}?filename={filename}&subfolder={subfolder}&type=output"

        try:
            with urllib.request.urlopen(view_url, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.URLError:
            # Log this error if you have a logger set up
            continue

    return None


def get_image_bytes_from_filesystem(prefix: str) -> bytes | None:
    """Fallback: scan output directory for the most recent matching file."""
    output_dir = os.path.join(os.path.dirname(__file__), "..", "..", "output")
    if not os.path.exists(output_dir):
        output_dir = "output"

    pattern = os.path.join(output_dir, f"{prefix}*.png")
    files = glob.glob(pattern)
    if not files:
        return None

    # Sort by modification time, newest first
    files.sort(key=os.path.getmtime, reverse=True)
    latest = files[0]
    with open(latest, "rb") as f:
        return f.read()


def get_image_bytes_safe(prompt_id: str, card_name: str, timeout: int = 120) -> bytes:
    """
    Retrieve the generated image using a robust two-stage approach:
    1. Try history endpoint.
    2. If that fails, scan output folder for the file with matching prefix.
    3. If still nothing, wait and retry a few times.
    """
    start_time = time.time()
    prefix = f"tarot_{sanitize_filename(card_name)}"

    while time.time() - start_time < timeout:
        # Try history first
        data = get_image_bytes_from_history(prompt_id)
        if data:
            return data

        # Fallback to filesystem
        data = get_image_bytes_from_filesystem(prefix)
        if data:
            return data

        time.sleep(2)

    raise TimeoutError(f"Timeout waiting for image for prompt {prompt_id}")


# ----------------------------------------------------------------------
# MAIN GENERATION FUNCTIONS
# ----------------------------------------------------------------------


def generate_card(
    card_name: str,
    style: str = "medieval",
    character_description: str = "",
    seed: int = 0,
    timeout: int = 120,
) -> str:
    """
    Generate a single tarot card image.
    Returns the path to the saved image.
    """
    if seed == 0:
        seed = random.randint(1, 2**32 - 1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    workflow = build_workflow(card_name, style, seed, character_description)
    prompt_id = queue_prompt_with_retry(workflow)
    image_data = get_image_bytes_safe(prompt_id, card_name, timeout)

    filename = sanitize_filename(card_name)
    out_path = os.path.join(OUTPUT_DIR, filename)
    with open(out_path, "wb") as f:
        f.write(image_data)

    return out_path


def generate_deck(
    cards: list[dict[str, str]],
    style: str = "medieval",
    seed_base: int = 0,
    timeout_per_card: int = 120,
) -> list[dict[str, str]]:
    """
    Generate a full deck of tarot cards.
    cards: list of dicts with keys 'name' and 'description' (character description)
    Returns list of dicts with 'name' and 'path'.
    """
    results: list[dict[str, str]] = []
    for i, card in enumerate(cards):
        seed = seed_base + i if seed_base else 0
        card_name = card.get("name", f"Card_{i}")
        description = card.get("description", "")
        try:
            path = generate_card(card_name, style, description, seed, timeout_per_card)
            results.append({"name": card_name, "path": path})
        except Exception as e:
            print(f"Failed to generate card '{card_name}': {e}")
            results.append({"name": card_name, "error": str(e)})
    return results


# ----------------------------------------------------------------------
# EXAMPLE USAGE (if run directly)
# ----------------------------------------------------------------------

if __name__ == "__main__":
    # Quick test for a single card
    test_card = {
        "name": "The Fool",
        "description": "a young woman with long dark hair, confused expression",
    }
    try:
        path = generate_card(
            test_card["name"],
            style="medieval",
            character_description=test_card["description"],
        )
        print(f"Generated: {path}")
    except Exception as e:
        print(f"Error: {e}")
