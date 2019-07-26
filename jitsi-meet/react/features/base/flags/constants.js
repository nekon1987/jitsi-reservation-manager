// @flow

/**
 * Flag indicating if calendar integration should be enabled.
 * Default: enabled (true) on Android, auto-detected on iOS.
 */
export const CALENDAR_ENABLED = 'calendar.enabled';

/**
 * Flag indicating if chat should be enabled.
 * Default: enabled (true).
 */
export const CHAT_ENABLED = 'chat.enabled';

/**
 * Flag indicating if recording should be enabled in iOS.
 * Default: disabled (false).
 */
export const IOS_RECORDING_ENABLED = 'ios.recording.enabled';

/**
 * Flag indicating if Picture-in-Picture should be enabled.
 * Default: auto-detected.
 */
export const PIP_ENABLED = 'pip.enabled';

/**
 * Flag indicating if the welcome page should be enabled.
 * Default: disabled (false).
 */
export const WELCOME_PAGE_ENABLED = 'welcomepage.enabled';
