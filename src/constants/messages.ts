// src/constants/messages.ts
export const MESSAGE_KINDS = ['CHAT', 'TITLE', 'ACTIONBAR', 'BOSSBAR'] as const
export type MessageKind = (typeof MESSAGE_KINDS)[number]
