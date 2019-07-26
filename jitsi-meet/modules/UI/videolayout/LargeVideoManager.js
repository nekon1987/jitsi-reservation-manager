/* global $, APP */
/* eslint-disable no-unused-vars */
import React from 'react';
import ReactDOM from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';

import { Avatar } from '../../../react/features/base/avatar';
import { i18next } from '../../../react/features/base/i18n';
import { PresenceLabel } from '../../../react/features/presence-status';
/* eslint-enable no-unused-vars */

const logger = require('jitsi-meet-logger').getLogger(__filename);

import {
    JitsiParticipantConnectionStatus
} from '../../../react/features/base/lib-jitsi-meet';
import {
    updateKnownLargeVideoResolution
} from '../../../react/features/large-video';
import { createDeferred } from '../../util/helpers';
import UIEvents from '../../../service/UI/UIEvents';
import UIUtil from '../util/UIUtil';
import { VideoContainer, VIDEO_CONTAINER_TYPE } from './VideoContainer';

import AudioLevels from '../audio_levels/AudioLevels';

const DESKTOP_CONTAINER_TYPE = 'desktop';

/**
 * Manager for all Large containers.
 */
export default class LargeVideoManager {
    /**
     * Checks whether given container is a {@link VIDEO_CONTAINER_TYPE}.
     * FIXME currently this is a workaround for the problem where video type is
     * mixed up with container type.
     * @param {string} containerType
     * @return {boolean}
     */
    static isVideoContainer(containerType) {
        return containerType === VIDEO_CONTAINER_TYPE
            || containerType === DESKTOP_CONTAINER_TYPE;
    }

    /**
     *
     */
    constructor(emitter) {
        /**
         * The map of <tt>LargeContainer</tt>s where the key is the video
         * container type.
         * @type {Object.<string, LargeContainer>}
         */
        this.containers = {};
        this.eventEmitter = emitter;

        this.state = VIDEO_CONTAINER_TYPE;

        // FIXME: We are passing resizeContainer as parameter which is calling
        // Container.resize. Probably there's better way to implement this.
        this.videoContainer = new VideoContainer(
            () => this.resizeContainer(VIDEO_CONTAINER_TYPE), emitter);
        this.addContainer(VIDEO_CONTAINER_TYPE, this.videoContainer);

        // use the same video container to handle desktop tracks
        this.addContainer(DESKTOP_CONTAINER_TYPE, this.videoContainer);

        this.width = 0;
        this.height = 0;

        /**
         * Cache the aspect ratio of the video displayed to detect changes to
         * the aspect ratio on video resize events.
         *
         * @type {number}
         */
        this._videoAspectRatio = 0;

        this.$container = $('#largeVideoContainer');

        this.$container.css({
            display: 'inline-block'
        });

        this.$container.hover(
            e => this.onHoverIn(e),
            e => this.onHoverOut(e)
        );

        // Bind event handler so it is only bound once for every instance.
        this._onVideoResolutionUpdate
            = this._onVideoResolutionUpdate.bind(this);

        this.videoContainer.addResizeListener(this._onVideoResolutionUpdate);

        this._dominantSpeakerAvatarContainer
            = document.getElementById('dominantSpeakerAvatarContainer');
    }

    /**
     * Removes any listeners registered on child components, including
     * React Components.
     *
     * @returns {void}
     */
    destroy() {
        this.videoContainer.removeResizeListener(
            this._onVideoResolutionUpdate);

        this.removePresenceLabel();

        ReactDOM.unmountComponentAtNode(this._dominantSpeakerAvatarContainer);

        this.$container.css({ display: 'none' });
    }

    /**
     *
     */
    onHoverIn(e) {
        if (!this.state) {
            return;
        }
        const container = this.getCurrentContainer();

        container.onHoverIn(e);
    }

    /**
     *
     */
    onHoverOut(e) {
        if (!this.state) {
            return;
        }
        const container = this.getCurrentContainer();

        container.onHoverOut(e);
    }

    /**
     * Called when the media connection has been interrupted.
     */
    onVideoInterrupted() {
        this.enableLocalConnectionProblemFilter(true);
        this._setLocalConnectionMessage('connection.RECONNECTING');

        // Show the message only if the video is currently being displayed
        this.showLocalConnectionMessage(
            LargeVideoManager.isVideoContainer(this.state));
    }

    /**
     * Called when the media connection has been restored.
     */
    onVideoRestored() {
        this.enableLocalConnectionProblemFilter(false);
        this.showLocalConnectionMessage(false);
    }

    /**
     *
     */
    get id() {
        const container = this.getCurrentContainer();

        // If a user switch for large video is in progress then provide what
        // will be the end result of the update.
        if (this.updateInProcess
            && this.newStreamData
            && this.newStreamData.id !== container.id) {
            return this.newStreamData.id;
        }

        return container.id;
    }

    /**
     *
     */
    scheduleLargeVideoUpdate() {
        if (this.updateInProcess || !this.newStreamData) {
            return;
        }

        this.updateInProcess = true;

        // Include hide()/fadeOut only if we're switching between users
        // eslint-disable-next-line eqeqeq
        const container = this.getCurrentContainer();
        const isUserSwitch = this.newStreamData.id !== container.id;
        const preUpdate = isUserSwitch ? container.hide() : Promise.resolve();

        preUpdate.then(() => {
            const { id, stream, videoType, resolve } = this.newStreamData;

            // FIXME this does not really make sense, because the videoType
            // (camera or desktop) is a completely different thing than
            // the video container type (Etherpad, SharedVideo, VideoContainer).
            const isVideoContainer
                = LargeVideoManager.isVideoContainer(videoType);

            this.newStreamData = null;

            logger.info('hover in %s', id);
            this.state = videoType;
            // eslint-disable-next-line no-shadow
            const container = this.getCurrentContainer();

            container.setStream(id, stream, videoType);

            // change the avatar url on large
            this.updateAvatar();

            // If the user's connection is disrupted then the avatar will be
            // displayed in case we have no video image cached. That is if
            // there was a user switch (image is lost on stream detach) or if
            // the video was not rendered, before the connection has failed.
            const wasUsersImageCached
                = !isUserSwitch && container.wasVideoRendered;
            const isVideoMuted = !stream || stream.isMuted();

            const connectionStatus
                = APP.conference.getParticipantConnectionStatus(id);
            const isVideoRenderable
                = !isVideoMuted
                    && (APP.conference.isLocalId(id)
                        || connectionStatus
                                === JitsiParticipantConnectionStatus.ACTIVE
                        || wasUsersImageCached);

            const showAvatar
                = isVideoContainer
                    && (APP.conference.isAudioOnly() || !isVideoRenderable);

            let promise;

            // do not show stream if video is muted
            // but we still should show watermark
            if (showAvatar) {
                this.showWatermark(true);

                // If the intention of this switch is to show the avatar
                // we need to make sure that the video is hidden
                promise = container.hide();
            } else {
                promise = container.show();
            }

            // show the avatar on large if needed
            container.showAvatar(showAvatar);

            // Clean up audio level after previous speaker.
            if (showAvatar) {
                this.updateLargeVideoAudioLevel(0);
            }

            const isConnectionInterrupted
                = APP.conference.getParticipantConnectionStatus(id)
                    === JitsiParticipantConnectionStatus.INTERRUPTED;
            let messageKey = null;

            if (isConnectionInterrupted) {
                messageKey = 'connection.USER_CONNECTION_INTERRUPTED';
            } else if (connectionStatus
                    === JitsiParticipantConnectionStatus.INACTIVE) {
                messageKey = 'connection.LOW_BANDWIDTH';
            }

            // Make sure no notification about remote failure is shown as
            // its UI conflicts with the one for local connection interrupted.
            // For the purposes of UI indicators, audio only is considered as
            // an "active" connection.
            const overrideAndHide
                = APP.conference.isAudioOnly()
                    || APP.conference.isConnectionInterrupted();

            this.updateParticipantConnStatusIndication(
                    id,
                    !overrideAndHide && isConnectionInterrupted,
                    !overrideAndHide && messageKey);

            // Change the participant id the presence label is listening to.
            this.updatePresenceLabel(id);

            this.videoContainer.positionRemoteStatusMessages();

            // resolve updateLargeVideo promise after everything is done
            promise.then(resolve);

            return promise;
        }).then(() => {
            // after everything is done check again if there are any pending
            // new streams.
            this.updateInProcess = false;
            this.eventEmitter.emit(UIEvents.LARGE_VIDEO_ID_CHANGED, this.id);
            this.scheduleLargeVideoUpdate();
        });
    }

    /**
     * Shows/hides notification about participant's connectivity issues to be
     * shown on the large video area.
     *
     * @param {string} id the id of remote participant(MUC nickname)
     * @param {boolean} showProblemsIndication
     * @param {string|null} messageKey the i18n key of the message which will be
     * displayed on the large video or <tt>null</tt> to hide it.
     *
     * @private
     */
    updateParticipantConnStatusIndication(
            id,
            showProblemsIndication,
            messageKey) {
        // Apply grey filter on the large video
        this.videoContainer.showRemoteConnectionProblemIndicator(
            showProblemsIndication);

        if (messageKey) {
            // Get user's display name
            const displayName
                = APP.conference.getParticipantDisplayName(id);

            this._setRemoteConnectionMessage(
                messageKey,
                { displayName });

            // Show it now only if the VideoContainer is on top
            this.showRemoteConnectionMessage(
                LargeVideoManager.isVideoContainer(this.state));
        } else {
            // Hide the message
            this.showRemoteConnectionMessage(false);
        }

    }

    /**
     * Update large video.
     * Switches to large video even if previously other container was visible.
     * @param userID the userID of the participant associated with the stream
     * @param {JitsiTrack?} stream new stream
     * @param {string?} videoType new video type
     * @returns {Promise}
     */
    updateLargeVideo(userID, stream, videoType) {
        if (this.newStreamData) {
            this.newStreamData.reject();
        }

        this.newStreamData = createDeferred();
        this.newStreamData.id = userID;
        this.newStreamData.stream = stream;
        this.newStreamData.videoType = videoType;

        this.scheduleLargeVideoUpdate();

        return this.newStreamData.promise;
    }

    /**
     * Update container size.
     */
    updateContainerSize() {
        this.width = UIUtil.getAvailableVideoWidth();
        this.height = window.innerHeight;
    }

    /**
     * Resize Large container of specified type.
     * @param {string} type type of container which should be resized.
     * @param {boolean} [animate=false] if resize process should be animated.
     */
    resizeContainer(type, animate = false) {
        const container = this.getContainer(type);

        container.resize(this.width, this.height, animate);
    }

    /**
     * Resize all Large containers.
     * @param {boolean} animate if resize process should be animated.
     */
    resize(animate) {
        // resize all containers
        Object.keys(this.containers)
            .forEach(type => this.resizeContainer(type, animate));
    }

    /**
     * Enables/disables the filter indicating a video problem to the user caused
     * by the problems with local media connection.
     *
     * @param enable <tt>true</tt> to enable, <tt>false</tt> to disable
     */
    enableLocalConnectionProblemFilter(enable) {
        this.videoContainer.enableLocalConnectionProblemFilter(enable);
    }

    /**
     * Updates the src of the dominant speaker avatar
     */
    updateAvatar() {
        ReactDOM.render(
            <Provider store = { APP.store }>
                <Avatar
                    id = "dominantSpeakerAvatar"
                    participantId = { this.id }
                    size = { 200 } />
            </Provider>,
            this._dominantSpeakerAvatarContainer
        );
    }

    /**
     * Updates the audio level indicator of the large video.
     *
     * @param lvl the new audio level to set
     */
    updateLargeVideoAudioLevel(lvl) {
        AudioLevels.updateLargeVideoAudioLevel('dominantSpeaker', lvl);
    }

    /**
     * Displays a message of the passed in participant id's presence status. The
     * message will not display if the remote connection message is displayed.
     *
     * @param {string} id - The participant ID whose associated user's presence
     * status should be displayed.
     * @returns {void}
     */
    updatePresenceLabel(id) {
        const isConnectionMessageVisible
            = $('#remoteConnectionMessage').is(':visible');

        if (isConnectionMessageVisible) {
            this.removePresenceLabel();

            return;
        }

        const presenceLabelContainer = $('#remotePresenceMessage');

        if (presenceLabelContainer.length) {
            ReactDOM.render(
                <Provider store = { APP.store }>
                    <I18nextProvider i18n = { i18next }>
                        <PresenceLabel
                            participantID = { id }
                            className = 'presence-label' />
                    </I18nextProvider>
                </Provider>,
                presenceLabelContainer.get(0));
        }
    }

    /**
     * Removes the messages about the displayed participant's presence status.
     *
     * @returns {void}
     */
    removePresenceLabel() {
        const presenceLabelContainer = $('#remotePresenceMessage');

        if (presenceLabelContainer.length) {
            ReactDOM.unmountComponentAtNode(presenceLabelContainer.get(0));
        }
    }

    /**
     * Show or hide watermark.
     * @param {boolean} show
     */
    showWatermark(show) {
        $('.watermark').css('visibility', show ? 'visible' : 'hidden');
    }

    /**
     * Shows/hides the message indicating problems with local media connection.
     * @param {boolean|null} show(optional) tells whether the message is to be
     * displayed or not. If missing the condition will be based on the value
     * obtained from {@link APP.conference.isConnectionInterrupted}.
     */
    showLocalConnectionMessage(show) {
        if (typeof show !== 'boolean') {
            // eslint-disable-next-line no-param-reassign
            show = APP.conference.isConnectionInterrupted();
        }

        const id = 'localConnectionMessage';

        UIUtil.setVisible(id, show);

        if (show) {
            // Avatar message conflicts with 'videoConnectionMessage',
            // so it must be hidden
            this.showRemoteConnectionMessage(false);
        }
    }

    /**
     * Shows hides the "avatar" message which is to be displayed either in
     * the middle of the screen or below the avatar image.
     *
     * @param {boolean|undefined} [show=undefined] <tt>true</tt> to show
     * the avatar message or <tt>false</tt> to hide it. If not provided then
     * the connection status of the user currently on the large video will be
     * obtained form "APP.conference" and the message will be displayed if
     * the user's connection is either interrupted or inactive.
     */
    showRemoteConnectionMessage(show) {
        if (typeof show !== 'boolean') {
            const connStatus
                = APP.conference.getParticipantConnectionStatus(this.id);

            // eslint-disable-next-line no-param-reassign
            show = !APP.conference.isLocalId(this.id)
                && (connStatus === JitsiParticipantConnectionStatus.INTERRUPTED
                    || connStatus
                        === JitsiParticipantConnectionStatus.INACTIVE);
        }

        if (show) {
            $('#remoteConnectionMessage').css({ display: 'block' });

            // 'videoConnectionMessage' message conflicts with 'avatarMessage',
            // so it must be hidden
            this.showLocalConnectionMessage(false);
        } else {
            $('#remoteConnectionMessage').hide();
        }
    }

    /**
     * Updates the text which describes that the remote user is having
     * connectivity issues.
     *
     * @param {string} msgKey the translation key which will be used to get
     * the message text.
     * @param {object} msgOptions translation options object.
     *
     * @private
     */
    _setRemoteConnectionMessage(msgKey, msgOptions) {
        if (msgKey) {
            $('#remoteConnectionMessage')
                .attr('data-i18n', msgKey)
                .attr('data-i18n-options', JSON.stringify(msgOptions));
            APP.translation.translateElement(
                $('#remoteConnectionMessage'), msgOptions);
        }
    }

    /**
     * Updated the text which is to be shown on the top of large video, when
     * local media connection is interrupted.
     *
     * @param {string} msgKey the translation key which will be used to get
     * the message text to be displayed on the large video.
     *
     * @private
     */
    _setLocalConnectionMessage(msgKey) {
        $('#localConnectionMessage')
            .attr('data-i18n', msgKey);
        APP.translation.translateElement($('#localConnectionMessage'));
    }

    /**
     * Add container of specified type.
     * @param {string} type container type
     * @param {LargeContainer} container container to add.
     */
    addContainer(type, container) {
        if (this.containers[type]) {
            throw new Error(`container of type ${type} already exist`);
        }

        this.containers[type] = container;
        this.resizeContainer(type);
    }

    /**
     * Get Large container of specified type.
     * @param {string} type container type.
     * @returns {LargeContainer}
     */
    getContainer(type) {
        const container = this.containers[type];

        if (!container) {
            throw new Error(`container of type ${type} doesn't exist`);
        }

        return container;
    }

    /**
     * Returns {@link LargeContainer} for the current {@link state}
     *
     * @return {LargeContainer}
     *
     * @throws an <tt>Error</tt> if there is no container for the current
     * {@link state}.
     */
    getCurrentContainer() {
        return this.getContainer(this.state);
    }

    /**
     * Returns type of the current {@link LargeContainer}
     * @return {string}
     */
    getCurrentContainerType() {
        return this.state;
    }

    /**
     * Remove Large container of specified type.
     * @param {string} type container type.
     */
    removeContainer(type) {
        if (!this.containers[type]) {
            throw new Error(`container of type ${type} doesn't exist`);
        }

        delete this.containers[type];
    }

    /**
     * Show Large container of specified type.
     * Does nothing if such container is already visible.
     * @param {string} type container type.
     * @returns {Promise}
     */
    showContainer(type) {
        if (this.state === type) {
            return Promise.resolve();
        }

        const oldContainer = this.containers[this.state];

        // FIXME when video is being replaced with other content we need to hide
        // companion icons/messages. It would be best if the container would
        // be taking care of it by itself, but that is a bigger refactoring

        if (LargeVideoManager.isVideoContainer(this.state)) {
            this.showWatermark(false);
            this.showLocalConnectionMessage(false);
            this.showRemoteConnectionMessage(false);
        }
        oldContainer.hide();

        this.state = type;
        const container = this.getContainer(type);

        return container.show().then(() => {
            if (LargeVideoManager.isVideoContainer(type)) {
                // FIXME when video appears on top of other content we need to
                // show companion icons/messages. It would be best if
                // the container would be taking care of it by itself, but that
                // is a bigger refactoring
                this.showWatermark(true);

                // "avatar" and "video connection" can not be displayed both
                // at the same time, but the latter is of higher priority and it
                // will hide the avatar one if will be displayed.
                this.showRemoteConnectionMessage(/* fetch the current state */);
                this.showLocalConnectionMessage(/* fetch the current state */);
            }
        });
    }

    /**
     * Changes the flipX state of the local video.
     * @param val {boolean} true if flipped.
     */
    onLocalFlipXChange(val) {
        this.videoContainer.setLocalFlipX(val);
    }

    /**
     * Dispatches an action to update the known resolution state of the
     * large video and adjusts container sizes when the resolution changes.
     *
     * @private
     * @returns {void}
     */
    _onVideoResolutionUpdate() {
        const { height, width } = this.videoContainer.getStreamSize();
        const { resolution } = APP.store.getState()['features/large-video'];

        if (height !== resolution) {
            APP.store.dispatch(updateKnownLargeVideoResolution(height));
        }

        const currentAspectRatio = width / height;

        if (this._videoAspectRatio !== currentAspectRatio) {
            this._videoAspectRatio = currentAspectRatio;
            this.resize();
        }
    }
}
