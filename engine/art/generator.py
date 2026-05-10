"""
Card image generation via ComfyUI API (Flux Schnell) – robust history + folder fallback.
"""

import glob
import json
import os
import random
import time
import urllib.error
import urllib.request

COMFY_URL = os.getenv("COMFY_URL", "http://localhost:8188")
COMFY_OUTPUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "ComfyUI", "output"
)
OUTPUT_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "static", "img", "cards"
)

CARD_PROMPT_TEMPLATE = (
    'tarot card "{card_name}", medieval woodcut, heavy ink lines, '
    "crosshatching, halftone dots, distressed silkscreen texture, "
    "sickly yellowed parchment, Albrecht Dürer engraving style, "
    "Frank Frazetta anatomy, Richard Corben grotesquery, "
    "gothic ruined architecture, toxic neon highlights (cyan, magenta, vermilion), "
    "dark moody lighting, no text, no signature"
)


def sanitize_filename(card_name: str) -> str:
    for ch in " ' , : ( ) [ ] \" \\ /":
        card_name = card_name.replace(ch, "_")
    while "__" in card_name:
        card_name = card_name.replace("__", "_")
    return card_name.strip("_").lower() + ".png"


def queue_prompt(workflow: dict, timeout: int = 30) -> str:
    body = json.dumps({"prompt": workflow}).encode("utf-8")
    req = urllib.request.Request(f"{COMFY_URL}/prompt", data=body)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        result = json.loads(resp.read())
        if "prompt_id" not in result:
            raise RuntimeError(f"ComfyUI did not return a prompt_id: {result}")
        return result["prompt_id"]


def get_image_bytes(prompt_id: str, timeout: int = 120) -> bytes:
    """Try to fetch image from history, then fallback to newest file in ComfyUI output folder."""
    # --- Attempt 1: history ---
    deadline = time.time() + timeout
    while time.time() < deadline:
        req = urllib.request.Request(f"{COMFY_URL}/history/{prompt_id}")
        with urllib.request.urlopen(req) as resp:
            history = json.loads(resp.read())
        if prompt_id in history:
            outputs = history[prompt_id].get("outputs", {})
            for node_id, node_output in outputs.items():
                if "images" in node_output and node_output["images"]:
                    image = node_output["images"][0]
                    img_url = f"{COMFY_URL}/view?filename={image['filename']}&subfolder={image.get('subfolder', '')}&type={image['type']}"
                    with urllib.request.urlopen(img_url) as img_resp:
                        return img_resp.read()
        time.sleep(1)

    # --- Attempt 2: fallback – newest file in ComfyUI/output/ ---
    if os.path.isdir(COMFY_OUTPUT_DIR):
        files = glob.glob(os.path.join(COMFY_OUTPUT_DIR, "*.png"))
        if files:
            newest = max(files, key=os.path.getmtime)
            with open(newest, "rb") as f:
                return f.read()

    raise TimeoutError(f"Could not retrieve image for prompt {prompt_id}")


def build_workflow(
    card_name: str, seed: int = 42, width: int = 512, height: int = 768
) -> dict:
    prompt = CARD_PROMPT_TEMPLATE.format(card_name=card_name)
    return {
        "1": {
            "inputs": {
                "unet_name": "flux1-schnell-fp8.safetensors",
                "weight_dtype": "default",
            },
            "class_type": "UNETLoader",
            "_meta": {"title": "Load Diffusion Model"},
        },
        "2": {
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
                "type": "flux",
                "device": "default",
            },
            "class_type": "DualCLIPLoader",
            "_meta": {"title": "DualCLIPLoader"},
        },
        "3": {
            "inputs": {"vae_name": "ae.sft"},
            "class_type": "VAELoader",
            "_meta": {"title": "Load VAE"},
        },
        "4": {
            "inputs": {"text": prompt, "clip": ["2", 0]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "CLIP Text Encode (Prompt)"},
        },
        "5": {
            "inputs": {"text": "", "clip": ["2", 0]},
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "CLIP Text Encode (Prompt)"},
        },
        "6": {
            "inputs": {"width": width, "height": height, "batch_size": 1},
            "class_type": "EmptyLatentImage",
            "_meta": {"title": "Empty Latent Image"},
        },
        "7": {
            "inputs": {
                "seed": seed,
                "steps": 4,
                "cfg": 1,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1,
                "model": ["1", 0],
                "positive": ["4", 0],
                "negative": ["5", 0],
                "latent_image": ["6", 0],
            },
            "class_type": "KSampler",
            "_meta": {"title": "KSampler"},
        },
        "8": {
            "inputs": {"samples": ["7", 0], "vae": ["3", 0]},
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"},
        },
        "9": {
            "inputs": {"images": ["8", 0], "filename_prefix": "TarocchAI"},
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"},
        },
    }


def generate_card(card_name: str, seed: int = 0) -> str:
    if seed == 0:
        seed = random.randint(1, 2**32 - 1)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    workflow = build_workflow(card_name, seed=seed)
    prompt_id = queue_prompt(workflow)
    image_data = get_image_bytes(prompt_id)

    filename = sanitize_filename(card_name)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "wb") as f:
        f.write(image_data)
    return path
