from fastapi import APIRouter, Form, UploadFile
from fastapi import File as FastApiFile

from app.core.errors import EmptyInputError, UnsupportedEncodingError
from app.schemas.tokenize import CustomSubMode, SourceType, TokenizeResponse, TokenizerMode
from app.services import file_service
from app.services.bpe_store import default_bpe_model_store
from app.services.custom_tokenizer_service import CustomTokenizerService
from app.services.stats_service import compute_statistics
from app.services.tiktoken_service import TiktokenService
from app.services.vocabulary_store import default_vocabulary_store

router = APIRouter()

# Module-level singletons: TiktokenService is stateless and CustomTokenizerService/BpeModelStore
# each share their one process-wide store, so there is no need to reconstruct any of them per
# request.
_tiktoken_service = TiktokenService()
_custom_tokenizer_service = CustomTokenizerService(default_vocabulary_store)


async def _resolve_input_text(
    text: str | None, file: UploadFile | None
) -> tuple[str, SourceType, str | None]:
    """Resolves the tokenizable text plus its source type and (for uploads) extracted text.

    Exactly one of `text`/`file` must be present and non-empty (FR-004); file validation and
    extraction are delegated to file_service (FR-002, FR-003, FR-005–FR-008).
    """
    has_text = text is not None and text.strip() != ""
    has_file = file is not None and file.filename

    if not has_text and not has_file:
        raise EmptyInputError()

    if has_file:
        assert file is not None
        content = await file.read()
        file_service.validate_upload(file.filename, content)

        if file.filename and file.filename.lower().endswith(".pdf"):
            extracted = file_service.extract_pdf(content)
            source_type: SourceType = "pdf_file"
        else:
            extracted = file_service.extract_txt(content)
            source_type = "txt_file"

        if not extracted.strip():
            raise EmptyInputError()
        return extracted, source_type, extracted

    assert text is not None
    return text, "text", None


@router.post("/tokenize", response_model=TokenizeResponse)
async def tokenize(
    tokenizer_mode: TokenizerMode = Form(...),
    custom_sub_mode: CustomSubMode = Form("simple"),
    encoding: str | None = Form(None),
    text: str | None = Form(None),
    file: UploadFile | None = FastApiFile(None),
) -> TokenizeResponse:
    """Tokenizes typed text or an uploaded TXT/PDF file with the selected tokenizer
    (FR-001, FR-002, FR-003, FR-009, FR-012)."""
    resolved_text, source_type, extracted_text = await _resolve_input_text(text, file)

    response_sub_mode: CustomSubMode | None = None
    if tokenizer_mode == "tiktoken":
        if encoding != "cl100k_base":
            raise UnsupportedEncodingError()
        outcome = _tiktoken_service.tokenize(resolved_text)
        response_encoding = "cl100k_base"
    elif custom_sub_mode == "bpe":
        outcome = default_bpe_model_store.tokenize(resolved_text)
        response_encoding = None
        response_sub_mode = "bpe"
    else:
        outcome = _custom_tokenizer_service.tokenize(resolved_text)
        response_encoding = None
        response_sub_mode = "simple"

    stats = compute_statistics(resolved_text, outcome.token_count)

    return TokenizeResponse(
        original_text=resolved_text,
        source_type=source_type,
        tokenizer_mode=tokenizer_mode,
        custom_sub_mode=response_sub_mode,
        encoding=response_encoding,
        extracted_text=extracted_text,
        character_count=stats.character_count,
        word_count=stats.word_count,
        token_count=stats.token_count,
        tokens_per_word=stats.tokens_per_word,
        tokens_per_character=stats.tokens_per_character,
        tokens=outcome.tokens,
    )
