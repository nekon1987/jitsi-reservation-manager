import {
    ADD_PENDING_DEVICE_REQUEST,
    REMOVE_PENDING_DEVICE_REQUESTS,
    SET_AUDIO_INPUT_DEVICE,
    SET_VIDEO_INPUT_DEVICE,
    UPDATE_DEVICE_LIST
} from './actionTypes';
import { groupDevicesByKind } from './functions';

import { ReducerRegistry } from '../redux';

const DEFAULT_STATE = {
    availableDevices: {
        audioInput: [],
        audioOutput: [],
        videoInput: []
    },
    pendingRequests: []
};

/**
 * Listen for actions which changes the state of known and used devices.
 *
 * @param {Object} state - The Redux state of the feature features/base/devices.
 * @param {Object} action - Action object.
 * @param {string} action.type - Type of action.
 * @param {Array<MediaDeviceInfo>} action.devices - All available audio and
 * video devices.
 * @returns {Object}
 */
ReducerRegistry.register(
    'features/base/devices',
    (state = DEFAULT_STATE, action) => {
        switch (action.type) {
        case UPDATE_DEVICE_LIST: {
            const deviceList = groupDevicesByKind(action.devices);

            return {
                ...state,
                availableDevices: deviceList
            };
        }

        case ADD_PENDING_DEVICE_REQUEST:
            return {
                ...state,
                pendingRequests: [
                    ...state.pendingRequests,
                    action.request
                ]
            };

        case REMOVE_PENDING_DEVICE_REQUESTS:
            return {
                ...state,
                pendingRequests: [ ]
            };

        // TODO: Changing of current audio and video device id is currently
        // handled outside of react/redux. Fall through to default logic for
        // now.
        case SET_AUDIO_INPUT_DEVICE:
        case SET_VIDEO_INPUT_DEVICE:
        default:
            return state;
        }
    });

