export type TokenizerMode = "tiktoken" | "custom";
export type CustomSubMode = "simple" | "bpe";
export type SourceType = "text" | "txt_file" | "pdf_file";
export type SupportedEncoding = "cl100k_base";
export type VocabularyStatus = "new" | "existing";

export interface TokenItem {
  index: number;
  id: number | null;
  text: string;
  is_new: boolean | null;
  is_unknown?: boolean | null;
}

export interface TokenizeResponse {
  original_text: string;
  source_type: SourceType;
  tokenizer_mode: TokenizerMode;
  custom_sub_mode?: CustomSubMode | null;
  encoding: SupportedEncoding | null;
  extracted_text: string | null;
  character_count: number;
  word_count: number;
  token_count: number;
  tokens_per_word: number;
  tokens_per_character: number;
  tokens: TokenItem[];
}

export interface VocabularyEntry {
  id: number;
  token: string;
  frequency: number;
  status: VocabularyStatus;
}

export interface VocabularyResetResponse {
  message: string;
  vocabulary: VocabularyEntry[];
}

export interface ApiError {
  error_code: string;
  message: string;
}
