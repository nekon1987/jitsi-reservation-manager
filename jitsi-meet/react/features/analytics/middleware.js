// @flow

import {
    CONFERENCE_JOINED,
    CONFERENCE_WILL_LEAVE,
    SET_ROOM
} from '../base/conference';
import { SET_CONFIG } from '../base/config';
import { MiddlewareRegistry } from '../base/redux';
import {
    getLocalAudioTrack,
    getLocalVideoTrack,
    TRACK_ADDED,
    TRACK_REMOVED,
    TRACK_UPDATED
} from '../base/tracks';

import { UPDATE_LOCAL_TRACKS_DURATION } from './actionTypes';
import { createLocalTracksDurationEvent } from './AnalyticsEvents';
import { initAnalytics, resetAnalytics, sendAnalytics } from './functions';

/**
 * Calculates the duration of the local tracks.
 *
 * @param {Object} state - The redux state.
 * @returns {Object} - The local tracks duration.
 */
function calculateLocalTrackDuration(state) {
    const now = Date.now();
    const { localTracksDuration } = state['features/analytics'];
    const { conference } = state['features/base/conference'];
    const { audio, video } = localTracksDuration;
    const { camera, desktop } = video;
    const tracks = state['features/base/tracks'];
    const audioTrack = getLocalAudioTrack(tracks);
    const videoTrack = getLocalVideoTrack(tracks);
    const newDuration = { ...localTracksDuration };

    if (!audioTrack || audioTrack.muted || !conference) {
        newDuration.audio = {
            startedTime: -1,
            value: audio.value + (audio.startedTime === -1 ? 0 : now - audio.startedTime)
        };
    } else if (audio.startedTime === -1) {
        newDuration.audio.startedTime = now;
    }

    if (!videoTrack || videoTrack.muted || !conference) {
        newDuration.video = {
            camera: {
                startedTime: -1,
                value: camera.value + (camera.startedTime === -1 ? 0 : now - camera.startedTime)
            },
            desktop: {
                startedTime: -1,
                value: desktop.value + (desktop.startedTime === -1 ? 0 : now - desktop.startedTime)
            }
        };
    } else {
        const { videoType } = videoTrack;

        if (video[videoType].startedTime === -1) {
            newDuration.video[videoType].startedTime = now;
        }
    }

    return {
        ...localTracksDuration,
        ...newDuration
    };
}

/**
 * Middleware which intercepts config actions to handle evaluating analytics
 * config based on the config stored in the store.
 *
 * @param {Store} store - The redux store.
 * @returns {Function}
 */
MiddlewareRegistry.register(store => next => action => {
    if (action.type === SET_CONFIG) {
        if (navigator.product === 'ReactNative') {
            // Reseting the analytics is currently not needed for web because
            // the user will be redirected to another page and new instance of
            // Analytics will be created and initialized.
            resetAnalytics();
        }
    }

    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED: {
        const { dispatch, getState } = store;
        const state = getState();

        dispatch({
            type: UPDATE_LOCAL_TRACKS_DURATION,
            localTracksDuration: {
                ...calculateLocalTrackDuration(state),
                conference: {
                    startedTime: Date.now(),
                    value: 0
                }
            }
        });
        break;
    }

    case CONFERENCE_WILL_LEAVE: {
        const { dispatch, getState } = store;
        const state = getState();
        const { localTracksDuration } = state['features/analytics'];
        const newLocalTracksDuration = {
            ...calculateLocalTrackDuration(state),
            conference: {
                startedTime: -1,
                value: Date.now() - localTracksDuration.conference.startedTime
            }
        };

        sendAnalytics(createLocalTracksDurationEvent(newLocalTracksDuration));

        dispatch({
            type: UPDATE_LOCAL_TRACKS_DURATION,
            localTracksDuration: newLocalTracksDuration
        });
        break;
    }
    case SET_ROOM: {
        initAnalytics(store);
        break;
    }
    case TRACK_ADDED:
    case TRACK_REMOVED:
    case TRACK_UPDATED: {
        const { dispatch, getState } = store;
        const state = getState();
        const { localTracksDuration } = state['features/analytics'];

        if (localTracksDuration.conference.startedTime === -1) {
            // We don't want to track the media duration if the conference is not joined yet because otherwise we won't
            // be able to compare them with the conference duration (from conference join to conference will leave).
            break;
        }
        dispatch({
            type: UPDATE_LOCAL_TRACKS_DURATION,
            localTracksDuration: {
                ...localTracksDuration,
                ...calculateLocalTrackDuration(state)
            }
        });
        break;
    }
    }

    return result;
});
