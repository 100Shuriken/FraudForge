"""
gemini_client.py — Thin Google Gemini SDK wrapper for FraudForge.

Usage:
    from gemini_client import ask_gemini
    text = ask_gemini("Write a phishing email targeting John at Bank of America.")

Raises GeminiConfigError if GEMINI_API_KEY is not set — callers should catch
this and fall back to mock responses. Rate-limit (free-tier) errors are retried
with exponential backoff, then raised as GeminiRateLimitError.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

_model = None
MODEL = "gemini-2.0-flash"
FALLBACK_MODELS = ("gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash")
MAX_RETRIES = 4
BASE_DELAY_SEC = 2.0


class GeminiConfigError(RuntimeError):
    """API key missing or SDK not installed."""


class GeminiRateLimitError(RuntimeError):
    """Free-tier quota / rate limit exhausted after retries."""


def _get_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or api_key.startswith("YOUR_") or api_key.startswith("AIza-YOUR"):
        raise GeminiConfigError("GEMINI_API_KEY not set — add it to backend/.env")
    return api_key


def _is_rate_limit(exc: Exception) -> bool:
    name = type(exc).__name__.lower()
    msg = str(exc).lower()
    if "resourceexhausted" in name or "toomanyrequests" in name:
        return True
    return any(token in msg for token in ("429", "resource exhausted", "rate limit", "quota", "retry in"))


def _extract_text(response) -> str:
    text = getattr(response, "text", None)
    if text:
        return text
    # Fallback when .text is empty but candidates exist
    candidates = getattr(response, "candidates", None) or []
    parts: list[str] = []
    for cand in candidates:
        content = getattr(cand, "content", None)
        for part in getattr(content, "parts", None) or []:
            piece = getattr(part, "text", None)
            if piece:
                parts.append(piece)
    if not parts:
        raise RuntimeError("Gemini returned an empty response")
    return "\n".join(parts)


def _get_model(system: str | None = None):
    """Lazily initialise a GenerativeModel (avoids import errors if SDK absent)."""
    global _model
    # Recreate when system instruction changes
    cache_key = system or ""
    if _model is not None and _model[0] == cache_key:
        return _model[1]

    api_key = _get_api_key()

    try:
        import google.generativeai as genai  # noqa: PLC0415
    except ImportError as exc:
        raise GeminiConfigError(
            "google-generativeai package not installed — run: pip install google-generativeai"
        ) from exc

    genai.configure(api_key=api_key)
    kwargs: dict = {"model_name": MODEL}
    if system:
        kwargs["system_instruction"] = system
    instance = genai.GenerativeModel(**kwargs)
    _model = (cache_key, instance)
    return instance


def ask_gemini(prompt: str, max_tokens: int = 800, system: str | None = None) -> str:
    """
    Send a prompt to Gemini and return the plain-text response.

    Retries on free-tier rate limits (429 / ResourceExhausted) with exponential backoff.
    """
    last_exc: Exception | None = None
    models_to_try = list(dict.fromkeys([MODEL, *FALLBACK_MODELS]))

    for model_name in models_to_try:
        for attempt in range(MAX_RETRIES):
            try:
                model = _get_model(system=system)
                if model_name != MODEL:
                    import google.generativeai as genai  # noqa: PLC0415
                    kwargs: dict = {"model_name": model_name}
                    if system:
                        kwargs["system_instruction"] = system
                    model = genai.GenerativeModel(**kwargs)

                response = model.generate_content(
                    prompt,
                    generation_config={"max_output_tokens": max_tokens, "temperature": 0.8},
                )
                return _extract_text(response)
            except GeminiConfigError:
                raise
            except Exception as exc:  # noqa: BLE001
                last_exc = exc
                if _is_rate_limit(exc) and attempt < MAX_RETRIES - 1:
                    time.sleep(BASE_DELAY_SEC * (2 ** attempt))
                    continue
                if _is_rate_limit(exc):
                    raise GeminiRateLimitError(
                        f"Gemini free-tier rate limit hit after {MAX_RETRIES} retries"
                    ) from exc
                # Try next model name only on "not found" style errors
                msg = str(exc).lower()
                if "not found" in msg or "is not supported" in msg:
                    break
                raise RuntimeError(f"Gemini request failed: {exc}") from exc

    raise RuntimeError(f"Gemini request failed: {last_exc}") from last_exc
