export interface BpeVocabularyEntry {
  id: number;
  symbol: string;
  is_base: boolean;
}

export interface BpeMergeRule {
  order: number;
  left: string;
  right: string;
  merged: string;
  id: number;
}

export interface BpeStateResponse {
  trained: boolean;
  vocabulary: BpeVocabularyEntry[];
  merge_rules: BpeMergeRule[];
  target_vocab_size: number | null;
  achieved_vocab_size: number | null;
  target_reached: boolean | null;
}
