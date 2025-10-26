export interface NodeData {
  type: 'root' | 'event';
  image: string | null;
  title: string;
  text: string;
  onImageUpload?: (file: File) => void;
  onGenerateImage?: (nodeId: string, eventPrompt: string) => Promise<void>;
  onImagePreview?: (imageUrl: string) => void;
  onExpandNode?: (nodeId: string, baseEvent: HistoricalEvent) => Promise<void>;
  isLoading: boolean;
  eventPrompt?: string;
}

export interface HistoricalEvent {
  title: string;
  prompt: string;
}