from pathlib import Path

import pytest

from app.core.errors import (
    CorruptedPdfError,
    FileTooLargeError,
    NoExtractableTextError,
    UnsupportedFileTypeError,
)
from app.services import file_service

FIXTURES = Path(__file__).parent.parent / "fixtures"


def test_validate_upload_accepts_txt_and_pdf() -> None:
    file_service.validate_upload("sample.txt", b"hello")
    file_service.validate_upload("sample.pdf", b"%PDF-1.4")


def test_validate_upload_rejects_unsupported_extension() -> None:
    with pytest.raises(UnsupportedFileTypeError):
        file_service.validate_upload("sample.docx", b"hello")


def test_validate_upload_rejects_oversized_content() -> None:
    oversized = (FIXTURES / "sample_oversized.txt").read_bytes()
    with pytest.raises(FileTooLargeError):
        file_service.validate_upload("sample_oversized.txt", oversized)


def test_extract_txt_decodes_utf8_text() -> None:
    raw = (FIXTURES / "sample.txt").read_bytes()
    text = file_service.extract_txt(raw)
    assert "quick brown fox" in text


def test_extract_pdf_returns_embedded_text() -> None:
    raw = (FIXTURES / "sample_valid.pdf").read_bytes()
    text = file_service.extract_pdf(raw)
    assert "Hello, world!" in text


def test_extract_pdf_raises_on_corrupted_file() -> None:
    raw = (FIXTURES / "sample_corrupted.pdf").read_bytes()
    with pytest.raises(CorruptedPdfError):
        file_service.extract_pdf(raw)


def test_extract_pdf_raises_when_no_text_found() -> None:
    raw = (FIXTURES / "sample_textless.pdf").read_bytes()
    with pytest.raises(NoExtractableTextError):
        file_service.extract_pdf(raw)
