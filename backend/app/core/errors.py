from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class TokenizerAppError(Exception):
    """Base class for all handled application errors."""

    error_code: str = "INTERNAL_ERROR"
    status_code: int = 400
    message: str = "Something went wrong. Please try again."

    def __init__(self, message: str | None = None) -> None:
        if message is not None:
            self.message = message
        super().__init__(self.message)


class EmptyInputError(TokenizerAppError):
    error_code = "EMPTY_INPUT"
    status_code = 400
    message = "Please enter some text or upload a file before tokenizing."


class UnsupportedFileTypeError(TokenizerAppError):
    error_code = "UNSUPPORTED_FILE_TYPE"
    status_code = 400
    message = "Unsupported file type. Please upload a .txt or .pdf file."


class FileTooLargeError(TokenizerAppError):
    error_code = "FILE_TOO_LARGE"
    status_code = 400
    message = "This file is larger than the 5MB limit. Please upload a smaller file."


class CorruptedPdfError(TokenizerAppError):
    error_code = "CORRUPTED_PDF"
    status_code = 400
    message = "This PDF could not be read. It may be corrupted or invalid."


class NoExtractableTextError(TokenizerAppError):
    error_code = "NO_EXTRACTABLE_TEXT"
    status_code = 400
    message = "No text could be found in this document (it may be a scanned image)."


class UnsupportedEncodingError(TokenizerAppError):
    error_code = "UNSUPPORTED_ENCODING"
    status_code = 400
    message = "Unsupported encoding. This application only supports the cl100k_base encoding."


class EmptyTrainingTextError(TokenizerAppError):
    error_code = "EMPTY_TRAINING_TEXT"
    status_code = 400
    message = "Please enter some training text before starting BPE training."


class TrainingTextTooLongError(TokenizerAppError):
    error_code = "TRAINING_TEXT_TOO_LONG"
    status_code = 400
    message = "This training text is longer than the 100,000 character limit. Please shorten it."


class InvalidVocabSizeError(TokenizerAppError):
    error_code = "INVALID_VOCAB_SIZE"
    status_code = 400
    message = "The target vocabulary size must be a positive whole number."


class VocabSizeTooLargeError(TokenizerAppError):
    error_code = "VOCAB_SIZE_TOO_LARGE"
    status_code = 400
    message = "The target vocabulary size is larger than the 5,000 limit. Please choose a smaller size."


class VocabSizeTooSmallError(TokenizerAppError):
    error_code = "VOCAB_SIZE_TOO_SMALL"
    status_code = 400
    message = (
        "The target vocabulary size must be larger than the number of distinct characters in "
        "the training text."
    )


class TrainingInProgressError(TokenizerAppError):
    error_code = "TRAINING_IN_PROGRESS"
    status_code = 409
    message = "A BPE training run is already in progress. Please wait for it to finish."


class NoTrainedBpeModelError(TokenizerAppError):
    error_code = "NO_TRAINED_BPE_MODEL"
    status_code = 400
    message = "No BPE tokenizer has been trained yet. Please train one before tokenizing."


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(TokenizerAppError)
    async def handle_tokenizer_app_error(_: Request, exc: TokenizerAppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error_code": exc.error_code, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "error_code": "INTERNAL_ERROR",
                "message": "Something went wrong. Please try again.",
            },
        )
