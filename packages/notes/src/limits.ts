/**
 * Limites das notas, pastas e lixeira, compartilhados entre servidor e app
 * para que o app valide antes de enviar e o servidor valide de verdade.
 * Ver docs/superpowers/specs/2026-11-08-markdown-notes-editor-design.md
 */

export const NOTE_TITLE_MAX_LENGTH = 200;
/** ~200 KB de texto. */
export const NOTE_CONTENT_MAX_LENGTH = 200_000;
export const FOLDER_NAME_MAX_LENGTH = 100;
/** Raiz = profundidade 0; uma pasta na raiz tem profundidade 1. */
export const FOLDER_MAX_DEPTH = 8;
export const TRASH_RETENTION_DAYS = 30;
