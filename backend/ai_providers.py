import os
import httpx
import base64
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from google.genai import types
import google.genai as genai
import asyncio

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def generate_text(self, messages: List[Dict[str, Any]], api_key: str, model: Optional[str] = None) -> str:
        pass
        
    @abstractmethod
    async def generate_image(self, prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[str]:
        pass

class GeminiProvider(AIProvider):
    @property
    def name(self) -> str:
        return "google"
        
    async def generate_text(self, messages: List[Dict[str, Any]], api_key: str, model: Optional[str] = None) -> str:
        gemini_messages = []
        system_instruction = ""
        for m in messages:
            if m["role"] == "system":
                system_instruction += m["content"] + "\n"
                continue
            
            role = "user" if m["role"] == "user" else "model"
            parts = []
            
            if isinstance(m["content"], str):
                parts.append(types.Part.from_text(text=m["content"]))
            elif isinstance(m["content"], list):
                for c in m["content"]:
                    if c.get("type") == "text":
                        parts.append(types.Part.from_text(text=c["text"]))
                    elif c.get("type") == "image_url":
                        url = c["image_url"]["url"]
                        if url.startswith("data:"):
                            mime, b64 = url.split(";", 1)
                            mime = mime.replace("data:", "")
                            b64 = b64.replace("base64,", "")
                            b64 += "=" * ((4 - len(b64) % 4) % 4)
                            parts.append(types.Part.from_bytes(data=base64.b64decode(b64), mime_type=mime))
            gemini_messages.append(types.Content(role=role, parts=parts))
        
        geminiConfig = {}
        if system_instruction:
            geminiConfig["system_instruction"] = system_instruction
        
        client = genai.Client(api_key=api_key)
        resp = await client.aio.models.generate_content(
            model=model or 'gemini-2.5-flash',
            contents=gemini_messages,
            config=geminiConfig
        )
        return resp.text.strip()

    async def generate_image(self, prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[str]:
        client = genai.Client(api_key=api_key)
        
        try:
            result = await client.aio.models.generate_images(
                model='imagen-3.0-generate-001',
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=aspect_ratio,
                    output_mime_type="image/jpeg"
                )
            )
            for generated_image in result.generated_images:
                b64 = base64.b64encode(generated_image.image.image_bytes).decode('utf-8')
                return f"data:image/jpeg;base64,{b64}"
            return None
        except Exception as e:
            logger.error(f"Image gen attempt failed: {e}")
            raise e


class OpenAIProvider(AIProvider):
    @property
    def name(self) -> str:
        return "openai"
        
    async def generate_text(self, messages: List[Dict[str, Any]], api_key: str, model: Optional[str] = None) -> str:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post("https://api.openai.com/v1/chat/completions", json={
                "model": model or "gpt-4o",
                "messages": messages
            }, headers={"Authorization": f"Bearer {api_key}"})
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()

    async def generate_image(self, prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[str]:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post("https://api.openai.com/v1/images/generations", json={
                "model": "dall-e-3",
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024",
                "response_format": "b64_json"
            }, headers={"Authorization": f"Bearer {api_key}"})
            resp.raise_for_status()
            data = resp.json()
            return f"data:image/png;base64,{data['data'][0]['b64_json']}"

class AnthropicProvider(AIProvider):
    @property
    def name(self) -> str:
        return "anthropic"
        
    async def generate_text(self, messages: List[Dict[str, Any]], api_key: str, model: Optional[str] = None) -> str:
        system = ""
        anthropic_messages = []
        for m in messages:
            if m["role"] == "system":
                system += m["content"] + "\n"
            else:
                content = m["content"]
                if isinstance(content, list):
                     new_content = []
                     for c in content:
                         if c.get("type") == "text":
                              new_content.append({"type": "text", "text": c["text"]})
                         elif c.get("type") == "image_url":
                              url = c["image_url"]["url"]
                              if url.startswith("data:"):
                                  mime, b64 = url.split(";", 1)
                                  mime = mime.replace("data:", "")
                                  b64 = b64.replace("base64,", "")
                                  b64 += "=" * ((4 - len(b64) % 4) % 4)
                                  new_content.append({
                                      "type": "image",
                                      "source": {
                                          "type": "base64",
                                          "media_type": mime,
                                          "data": b64
                                      }
                                  })
                     content = new_content
                anthropic_messages.append({"role": m["role"], "content": content})
                
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post("https://api.anthropic.com/v1/messages", json={
                "model": model or "claude-3-5-sonnet-20241022",
                "max_tokens": 4096,
                "system": system,
                "messages": anthropic_messages
            }, headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"})
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"].strip()
            
    async def generate_image(self, prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[str]:
        raise NotImplementedError("Anthropic does not support image generation")

class StandardOpenAICompatibleProvider(AIProvider):
    def __init__(self, provider_name: str, base_url: str, default_model: str):
        self.provider_name = provider_name
        self.base_url = base_url
        self.default_model = default_model
        
    @property
    def name(self) -> str:
        return self.provider_name
        
    async def generate_text(self, messages: List[Dict[str, Any]], api_key: str, model: Optional[str] = None) -> str:
        # Simplify multimodal to text for these if needed, but many don't support multimodal
        text_messages = []
        for m in messages:
            content = m["content"]
            if isinstance(content, list):
                content = "\n".join([c["text"] for c in content if c.get("type") == "text"])
            text_messages.append({"role": m["role"], "content": content})
            
        async with httpx.AsyncClient(timeout=300.0) as client:
            headers = {"Authorization": f"Bearer {api_key}"}
            if self.provider_name == "openrouter":
                headers["HTTP-Referer"] = "https://grexo.ai"
                headers["X-Title"] = "Grexo"
                
            resp = await client.post(f"{self.base_url}/chat/completions", json={
                "model": model or self.default_model,
                "messages": text_messages
            }, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
            
    async def generate_image(self, prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[str]:
        raise NotImplementedError(f"{self.provider_name} image generation not implemented via standard chat interface")

class ReplicateProvider(AIProvider):
    @property
    def name(self) -> str:
        return "replicate"
        
    async def generate_text(self, messages: List[Dict[str, Any]], api_key: str, model: Optional[str] = None) -> str:
         raise NotImplementedError("Replicate text generation complex to abstract simply")
         
    async def generate_image(self, prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[str]:
        async with httpx.AsyncClient(timeout=300.0) as client:
            resp = await client.post("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", json={
                "input": {"prompt": prompt}
            }, headers={"Authorization": f"Bearer {api_key}"})
            resp.raise_for_status()
            data = resp.json()
            prediction_id = data["id"]
            
            # Poll
            for _ in range(60):
                await asyncio.sleep(2)
                poll = await client.get(f"https://api.replicate.com/v1/predictions/{prediction_id}", headers={"Authorization": f"Bearer {api_key}"})
                poll_data = poll.json()
                if poll_data["status"] == "succeeded":
                    url = poll_data["output"][0]
                    # Fetch image and convert to base64
                    img_resp = await client.get(url)
                    img_b64 = base64.b64encode(img_resp.content).decode('utf-8')
                    return f"data:image/webp;base64,{img_b64}"
                elif poll_data["status"] == "failed":
                    raise Exception(f"Replicate generation failed: {poll_data.get('error')}")
            raise Exception("Replicate generation timed out")

class ProviderFactory:
    _providers = {
        "google": GeminiProvider(),
        "openai": OpenAIProvider(),
        "anthropic": AnthropicProvider(),
        "groq": StandardOpenAICompatibleProvider("groq", "https://api.groq.com/openai/v1", "llama3-70b-8192"),
        "openrouter": StandardOpenAICompatibleProvider("openrouter", "https://openrouter.ai/api/v1", "anthropic/claude-3-5-sonnet"),
        "deepseek": StandardOpenAICompatibleProvider("deepseek", "https://api.deepseek.com", "deepseek-chat"),
        "together": StandardOpenAICompatibleProvider("together", "https://api.together.xyz/v1", "meta-llama/Llama-3-70b-chat-hf"),
        "mistral": StandardOpenAICompatibleProvider("mistral", "https://api.mistral.ai/v1", "mistral-large-latest"),
        "fal": StandardOpenAICompatibleProvider("fal", "https://fal.run", "fal-ai/fast-llm"),
        "stability": StandardOpenAICompatibleProvider("stability", "https://api.stability.ai/v1", "stable-diffusion-xl-1024-v1-0"),
        "replicate": ReplicateProvider()
    }
    
    @classmethod
    def get_provider(cls, name: str) -> AIProvider:
        provider = cls._providers.get(name)
        if not provider:
            raise ValueError(f"Unknown provider: {name}")
        return provider
        
class ProviderManager:
    @staticmethod
    async def execute_text(messages: List[Dict[str, Any]], user_keys: Dict[str, Any], default_provider: str = "google", system_fallback: bool = False) -> str:
        # 1. Try selected provider
        provider_name = default_provider
        api_key = user_keys.get(provider_name, {}).get("api_key")
             
        if api_key:
             try:
                 provider = ProviderFactory.get_provider(provider_name)
                 return await provider.generate_text(messages, api_key)
             except Exception as e:
                 logger.error(f"Provider {provider_name} failed: {e}")
                 
        # 2. Fallback to other available personal keys
        for p_name, data in user_keys.items():
             if p_name != provider_name and data.get("api_key"):
                 try:
                     provider = ProviderFactory.get_provider(p_name)
                     return await provider.generate_text(messages, data["api_key"])
                 except Exception as e:
                     logger.error(f"Fallback Provider {p_name} failed: {e}")
                 
        raise Exception("MISSING_API_KEY")

    @staticmethod
    async def execute_image(prompt: str, user_keys: Dict[str, Any], aspect_ratio: str = "1:1", default_provider: str = "google", system_fallback: bool = False) -> str:
        provider_name = default_provider
        api_key = user_keys.get(provider_name, {}).get("api_key")
             
        if api_key:
             try:
                 provider = ProviderFactory.get_provider(provider_name)
                 res = await provider.generate_image(prompt, api_key, aspect_ratio)
                 if res: return res
             except NotImplementedError:
                 logger.error(f"Image Provider {provider_name} does not support image generation.")
                 # Continue to fallback
             except Exception as e:
                 logger.error(f"Image Provider {provider_name} failed: {e}")
                 raise Exception(f"{provider_name} image generation failed: {e}")
                 
        # Fallback personal keys that support imaging
        for p_name in ["openai", "google", "replicate"]:
             if p_name != provider_name and user_keys.get(p_name, {}).get("api_key"):
                 try:
                     provider = ProviderFactory.get_provider(p_name)
                     res = await provider.generate_image(prompt, user_keys[p_name]["api_key"], aspect_ratio)
                     if res: return res
                 except Exception:
                     pass
                 
        raise Exception("MISSING_API_KEY")

