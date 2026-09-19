from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized runtime configuration. All values have safe defaults for local development."""

    model_config = SettingsConfigDict(env_prefix="TOKENIZER_APP_")

    max_upload_size_bytes: int = 5 * 1024 * 1024  # 5MB, per spec Clarifications
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    host: str = "0.0.0.0"
    port: int = 8000
    max_bpe_training_text_length: int = 100_000  # characters, per spec Assumptions (FR-041)
    max_bpe_vocab_size: int = 5_000  # per spec Assumptions (FR-042)


settings = Settings()
