import type { Channel } from '../domain/channel';

export interface LoadProgress {
  /** Número de canais já recebidos. */
  loaded: number;
  /** Leitura de confirmação em curso (2.ª ou 3.ª), quando aplicável. */
  pass?: number;
}

export interface LoadOptions {
  /** Permite cancelar o carregamento (ex.: terminar sessão a meio). */
  signal?: AbortSignal;
  onProgress?: (progress: LoadProgress) => void;
}

/**
 * Origem das subscrições. A UI não sabe se os dados são DEMO ou reais:
 * passar da Etapa A para a Etapa C troca apenas a implementação.
 */
export interface SubscriptionSource {
  /** 'demo' faz a UI mostrar a etiqueta DEMO de forma visível. */
  readonly kind: 'demo' | 'youtube';
  load(options?: LoadOptions): Promise<Channel[]>;
}
