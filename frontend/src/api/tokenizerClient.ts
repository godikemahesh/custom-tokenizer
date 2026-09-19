import type {
  ApiError,
  CustomSubMode,
  TokenizeResponse,
  TokenizerMode,
  VocabularyEntry,
  VocabularyResetResponse,
} from "../types/tokenizer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class TokenizerApiError extends Error {
  errorCode: string;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.errorCode = apiError.error_code;
  }
}

async function parseErrorAndThrow(response: Response): Promise<never> {
  const body = (await response.json()) as ApiError;
  throw new TokenizerApiError(body);
}

export interface TokenizeParams {
  tokenizerMode: TokenizerMode;
  customSubMode?: CustomSubMode;
  encoding?: "cl100k_base";
  text?: string;
  file?: File;
}

export async function postTokenize(params: TokenizeParams): Promise<TokenizeResponse> {
  const formData = new FormData();
  formData.set("tokenizer_mode", params.tokenizerMode);
  if (params.customSubMode) {
    formData.set("custom_sub_mode", params.customSubMode);
  }
  if (params.encoding) {
    formData.set("encoding", params.encoding);
  }
  if (params.text !== undefined) {
    formData.set("text", params.text);
  }
  if (params.file) {
    formData.set("file", params.file);
  }

  const response = await fetch(`${API_BASE_URL}/api/tokenize`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    return parseErrorAndThrow(response);
  }
  return (await response.json()) as TokenizeResponse;
}

export async function getVocabulary(): Promise<VocabularyEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/vocabulary`);
  if (!response.ok) {
    return parseErrorAndThrow(response);
  }
  return (await response.json()) as VocabularyEntry[];
}

export async function resetVocabulary(): Promise<VocabularyResetResponse> {
  const response = await fetch(`${API_BASE_URL}/api/vocabulary/reset`, {
    method: "POST",
  });
  if (!response.ok) {
    return parseErrorAndThrow(response);
  }
  return (await response.json()) as VocabularyResetResponse;
}
