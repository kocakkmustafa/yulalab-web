/**
 * troika-three-text ships no type declarations. Only the single entry this
 * codebase touches is declared — widen deliberately if more is needed.
 */
declare module "troika-three-text" {
  export function configureTextBuilder(config: { useWorker?: boolean; sdfGlyphSize?: number }): void;
}
