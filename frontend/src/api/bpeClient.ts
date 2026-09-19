import type { BpeStateResponse } from "../types/bpe";
import type { ApiError } from "../types/tokenizer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class BpeApiError extends Error {
  errorCode: string;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.errorCode = apiError.error_code;
  }
}

async function parseErrorAndThrow(response: Response): Promise<never> {
  const body = (await response.json()) as ApiError;
  throw new BpeApiError(body);
}

export interface TrainBpeParams {
  trainingText: string;
  vocabSize: number;
}

export async function trainBpe(params: TrainBpeParams): Promise<BpeStateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/bpe/train`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ training_text: params.trainingText, vocab_size: params.vocabSize }),
  });

  if (!response.ok) {
    return parseErrorAndThrow(response);
  }
  return (await response.json()) as BpeStateResponse;
}

export async function getBpeState(): Promise<BpeStateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/bpe/vocabulary`);
  if (!response.ok) {
    return parseErrorAndThrow(response);
  }
  return (await response.json()) as BpeStateResponse;
}
