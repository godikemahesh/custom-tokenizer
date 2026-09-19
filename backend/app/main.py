from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import bpe, tokenize, vocabulary
from app.core.config import settings
from app.core.errors import register_exception_handlers

app = FastAPI(title="Tokenizer Application API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(tokenize.router, prefix="/api")
app.include_router(vocabulary.router, prefix="/api")
app.include_router(bpe.router, prefix="/api")
