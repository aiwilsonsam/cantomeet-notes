"""Summarization model constants for meeting minutes."""

# Built-in OpenAI models: gpt-4o, gpt-4o-mini, and gpt-5* (future)
# Custom providers (e.g., Claude) can be extended later via workspace_settings
SUMMARIZATION_AVAILABLE_MODELS = [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
    {"id": "gpt-4o-2024-11-20", "name": "GPT-4o (2024-11-20)", "provider": "openai"},
    {"id": "gpt-4o-2024-05-13", "name": "GPT-4o (2024-05-13)", "provider": "openai"},
    {"id": "gpt-4o-mini-2024-07-18", "name": "GPT-4o Mini (2024-07-18)", "provider": "openai"},
    # GPT-5 placeholder for future
    {"id": "gpt-5", "name": "GPT-5 (when available)", "provider": "openai"},
    {"id": "gpt-5-mini", "name": "GPT-5 Mini (when available)", "provider": "openai"},
]
