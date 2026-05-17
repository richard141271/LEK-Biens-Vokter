export type Voice2Intent =
  | { type: 'QUEEN_SEEN' }
  | { type: 'FEED_LOW' }
  | { type: 'FEED_GIVEN'; feedType: 'sukkerlake' | 'nodfor' | 'annet' }
  | { type: 'VARROA_NONE' }
  | { type: 'SAVE_INSPECTION' }
  | { type: 'UNKNOWN' };

export type Voice2State = 'idle' | 'listening' | 'speaking' | 'error';

