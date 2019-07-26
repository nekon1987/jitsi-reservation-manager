// @flow

import type { Dispatch } from 'redux';

declare var APP: Object;
declare var config: Object;

const logger = require('jitsi-meet-logger').getLogger(__filename);

import { configureInitialDevices } from '../devices';

export {
    connectionEstablished,
    connectionFailed,
    setLocationURL
} from './actions.native';

/**
 * Opens new connection.
 *
 * @returns {Promise<JitsiConnection>}
 */
export function connect() {
    return (dispatch: Dispatch<any>, getState: Function) => {
        // XXX Lib-jitsi-meet does not accept uppercase letters.
        const room = getState()['features/base/conference'].room.toLowerCase();

        // XXX For web based version we use conference initialization logic
        // from the old app (at the moment of writing).
        return dispatch(configureInitialDevices()).then(
            () => APP.conference.init({
                roomName: room
            }).catch(error => {
                APP.API.notifyConferenceLeft(APP.conference.roomName);
                logger.error(error);
            }));
    };
}

/**
 * Closes connection.
 *
 * @param {boolean} [requestFeedback] - Whether or not to attempt showing a
 * request for call feedback.
 * @returns {Function}
 */
export function disconnect(requestFeedback: boolean = false) {
    // XXX For web based version we use conference hanging up logic from the old
    // app.
    return () => APP.conference.hangup(requestFeedback);
}
