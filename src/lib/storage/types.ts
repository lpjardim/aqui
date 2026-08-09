export type StoredFile = {
  /** Caminho interno do ficheiro dentro do storage. */
  key: string;
  /** URL utilizável no browser. */
  url: string;
  contentType: string;
};

export interface StorageDriver {
  put(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<StoredFile>;

  remove(key: string): Promise<void>;

  /**
   * Só é usado por drivers que não servem ficheiros publicamente (ex.: disco local).
   * Drivers com URLs públicas devolvem null.
   */
  read(key: string): Promise<{ body: Buffer; contentType: string } | null>;
}
