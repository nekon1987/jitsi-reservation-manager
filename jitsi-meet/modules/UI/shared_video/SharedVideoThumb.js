/* global $ */

import SmallVideo from '../videolayout/SmallVideo';

const logger = require('jitsi-meet-logger').getLogger(__filename);

/**
 *
 */
export default function SharedVideoThumb(participant, videoType, VideoLayout) {
    this.id = participant.id;

    this.url = participant.id;
    this.setVideoType(videoType);
    this.videoSpanId = 'sharedVideoContainer';
    this.container = this.createContainer(this.videoSpanId);
    this.$container = $(this.container);

    this.bindHoverHandler();
    SmallVideo.call(this, VideoLayout);
    this.isVideoMuted = true;
    this.updateDisplayName();

    this.container.onclick = this._onContainerClick;
}
SharedVideoThumb.prototype = Object.create(SmallVideo.prototype);
SharedVideoThumb.prototype.constructor = SharedVideoThumb;

/**
 * hide display name
 */
// eslint-disable-next-line no-empty-function
SharedVideoThumb.prototype.setDeviceAvailabilityIcons = function() {};

// eslint-disable-next-line no-empty-function
SharedVideoThumb.prototype.initializeAvatar = function() {};

SharedVideoThumb.prototype.createContainer = function(spanId) {
    const container = document.createElement('span');

    container.id = spanId;
    container.className = 'videocontainer';

    // add the avatar
    const avatar = document.createElement('img');

    avatar.className = 'sharedVideoAvatar';
    avatar.src = `https://img.youtube.com/vi/${this.url}/0.jpg`;
    container.appendChild(avatar);

    const displayNameContainer = document.createElement('div');

    displayNameContainer.className = 'displayNameContainer';
    container.appendChild(displayNameContainer);

    const remoteVideosContainer
        = document.getElementById('filmstripRemoteVideosContainer');
    const localVideoContainer
        = document.getElementById('localVideoTileViewContainer');

    remoteVideosContainer.insertBefore(container, localVideoContainer);

    return container;
};

/**
 * Triggers re-rendering of the display name using current instance state.
 *
 * @returns {void}
 */
SharedVideoThumb.prototype.updateDisplayName = function() {
    if (!this.container) {
        logger.warn(`Unable to set displayName - ${this.videoSpanId
        } does not exist`);

        return;
    }

    this._renderDisplayName({
        elementID: `${this.videoSpanId}_name`,
        participantID: this.id
    });
};
