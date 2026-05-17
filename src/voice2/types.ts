export type Voice2Intent =
  | { type: 'QUEEN_SEEN' }
  | { type: 'QUEEN_NOT_SEEN' }
  | { type: 'QUEEN_COLOR'; color: 'hvit' | 'gul' | 'rod' | 'gronn' | 'bla' }
  | { type: 'EGGS_SEEN' }
  | { type: 'EGGS_NOT_SEEN' }
  | { type: 'BROOD_EGG'; amount: 'lite' | 'normal' | 'mye' }
  | { type: 'BROOD_LARVAE'; amount: 'lite' | 'normal' | 'mye' }
  | { type: 'BROOD_YNGEL'; amount: 'lite' | 'normal' | 'mye' }
  | { type: 'BROOD_DRONES'; amount: 'lite' | 'normal' | 'mye' }
  | { type: 'HONEY_STORES'; level: 'lite' | 'middels' | 'mye' }
  | { type: 'TEMPERAMENT'; temperament: 'rolig' | 'urolig' | 'aggressiv' }
  | { type: 'STATUS'; status: string }
  | { type: 'FEED_LOW' }
  | { type: 'FEED_GIVEN'; feedType: 'sukkerlake' | 'nodfor' | 'annet' }
  | { type: 'VARROA_NONE' }
  | { type: 'VARROA_SUSPECT' }
  | { type: 'VARROA_TREATED' }
  | { type: 'TAKE_PHOTO' }
  | { type: 'SAVE_INSPECTION' }
  | { type: 'UNKNOWN' };

export type Voice2State = 'idle' | 'listening' | 'speaking' | 'error';
