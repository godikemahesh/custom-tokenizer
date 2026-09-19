import pymupdf

from app.core.config import settings
from app.core.errors import (
    CorruptedPdfError,
    FileTooLargeError,
    NoExtractableTextError,
    UnsupportedFileTypeError,
)

_ALLOWED_EXTENSIONS = (".txt", ".pdf")


def validate_upload(filename: str | None, content: bytes) -> None:
    """Rejects unsupported types/oversized uploads before any parsing is attempted (FR-005, FR-006).

    Size is checked against the actual bytes received, not a declared Content-Length header, so a
    missing or incorrect header cannot bypass the 5MB limit.
    """
    if not filename or not filename.lower().endswith(_ALLOWED_EXTENSIONS):
        raise UnsupportedFileTypeError()
    if len(content) > settings.max_upload_size_bytes:
        raise FileTooLargeError()


def extract_txt(content: bytes) -> str:
    """Decodes a TXT upload as UTF-8 (FR-002)."""
    return content.decode("utf-8", errors="replace")


def extract_pdf(content: bytes) -> str:
    """Extracts text from a text-based PDF upload (FR-003), detecting corrupted files (FR-007)
    and PDFs with no extractable text, e.g. scanned/image-only documents (FR-008)."""
    try:
        document = pymupdf.open(stream=content, filetype="pdf")
    except Exception as exc:
        raise CorruptedPdfError() from exc

    try:
        text = "".join(page.get_text() for page in document)
    except Exception as exc:
        raise CorruptedPdfError() from exc
    finally:
        document.close()

    if not text.strip():
        raise NoExtractableTextError()

    return text
