/* global APP, $, config, interfaceConfig */

const logger = require('jitsi-meet-logger').getLogger(__filename);

const UI = {};

import messageHandler from './util/MessageHandler';
import UIUtil from './util/UIUtil';
import UIEvents from '../../service/UI/UIEvents';
import EtherpadManager from './etherpad/Etherpad';
import SharedVideoManager from './shared_video/SharedVideo';

import VideoLayout from './videolayout/VideoLayout';
import Filmstrip from './videolayout/Filmstrip';

import { getLocalParticipant } from '../../react/features/base/participants';
import { toggleChat } from '../../react/features/chat';
import { openDisplayNamePrompt } from '../../react/features/display-name';
import { setEtherpadHasInitialzied } from '../../react/features/etherpad';
import { setFilmstripVisible } from '../../react/features/filmstrip';
import { setNotificationsEnabled } from '../../react/features/notifications';
import {
    dockToolbox,
    setToolboxEnabled,
    showToolbox
} from '../../react/features/toolbox';

const EventEmitter = require('events');

UI.messageHandler = messageHandler;

const eventEmitter = new EventEmitter();

UI.eventEmitter = eventEmitter;

let etherpadManager;
let sharedVideoManager;

const UIListeners = new Map([
    [
        UIEvents.ETHERPAD_CLICKED,
        () => etherpadManager && etherpadManager.toggleEtherpad()
    ], [
        UIEvents.SHARED_VIDEO_CLICKED,
        () => sharedVideoManager && sharedVideoManager.toggleSharedVideo()
    ], [
        UIEvents.TOGGLE_FILMSTRIP,
        () => UI.toggleFilmstrip()
    ]
]);

/**
 * Indicates if we're currently in full screen mode.
 *
 * @return {boolean} {true} to indicate that we're currently in full screen
 * mode, {false} otherwise
 */
UI.isFullScreen = function() {
    return UIUtil.isFullScreen();
};

/**
 * Returns true if the etherpad window is currently visible.
 * @returns {Boolean} - true if the etherpad window is currently visible.
 */
UI.isEtherpadVisible = function() {
    return Boolean(etherpadManager && etherpadManager.isVisible());
};

/**
 * Returns true if there is a shared video which is being shown (?).
 * @returns {boolean} - true if there is a shared video which is being shown.
 */
UI.isSharedVideoShown = function() {
    return Boolean(sharedVideoManager && sharedVideoManager.isSharedVideoShown);
};

/**
 * Notify user that server has shut down.
 */
UI.notifyGracefulShutdown = function() {
    messageHandler.showError({
        descriptionKey: 'dialog.gracefulShutdown',
        titleKey: 'dialog.serviceUnavailable'
    });
};

/**
 * Notify user that reservation error happened.
 */
UI.notifyReservationError = function(code, msg) {
    messageHandler.showError({
        descriptionArguments: {
            code,
            msg
        },
        descriptionKey: 'dialog.reservationErrorMsg',
        titleKey: 'dialog.reservationError'
    });
};

/**
 * Notify user that conference was destroyed.
 * @param reason {string} the reason text
 */
UI.notifyConferenceDestroyed = function(reason) {
    // FIXME: use Session Terminated from translation, but
    // 'reason' text comes from XMPP packet and is not translated
    messageHandler.showError({
        description: reason,
        titleKey: 'dialog.sessTerminated'
    });
};

/**
 * Change nickname for the user.
 * @param {string} id user id
 * @param {string} displayName new nickname
 */
UI.changeDisplayName = function(id, displayName) {
    VideoLayout.onDisplayNameChanged(id, displayName);
};

/**
 * Initialize conference UI.
 */
UI.initConference = function() {
    const { getState } = APP.store;
    const { id, name } = getLocalParticipant(getState);

    // Update default button states before showing the toolbar
    // if local role changes buttons state will be again updated.
    UI.updateLocalRole(APP.conference.isModerator);

    UI.showToolbar();

    const displayName = config.displayJids ? id : name;

    if (displayName) {
        UI.changeDisplayName('localVideoContainer', displayName);
    }
};

/**
 * Returns the shared document manager object.
 * @return {EtherpadManager} the shared document manager object
 */
UI.getSharedVideoManager = function() {
    return sharedVideoManager;
};

/**
 * Starts the UI module and initializes all related components.
 *
 * @returns {boolean} true if the UI is ready and the conference should be
 * established, false - otherwise (for example in the case of welcome page)
 */
UI.start = function() {
    // Set the defaults for prompt dialogs.
    $.prompt.setDefaults({ persistent: false });

    Filmstrip.init(eventEmitter);

    VideoLayout.init(eventEmitter);
    if (!interfaceConfig.filmStripOnly) {
        VideoLayout.initLargeVideo();
    }

    // Do not animate the video area on UI start (second argument passed into
    // resizeVideoArea) because the animation is not visible anyway. Plus with
    // the current dom layout, the quality label is part of the video layout and
    // will be seen animating in.
    VideoLayout.resizeVideoArea(true, false);

    sharedVideoManager = new SharedVideoManager(eventEmitter);

    if (interfaceConfig.filmStripOnly) {
        $('body').addClass('filmstrip-only');
        APP.store.dispatch(setNotificationsEnabled(false));
    } else if (config.iAmRecorder) {
        // in case of iAmSipGateway keep local video visible
        if (!config.iAmSipGateway) {
            VideoLayout.setLocalVideoVisible(false);
        }

        APP.store.dispatch(setToolboxEnabled(false));
        APP.store.dispatch(setNotificationsEnabled(false));
        UI.messageHandler.enablePopups(false);
    }
};

/**
 * Setup some UI event listeners.
 */
UI.registerListeners
    = () => UIListeners.forEach((value, key) => UI.addListener(key, value));

/**
 * Setup some DOM event listeners.
 */
UI.bindEvents = () => {
    /**
     *
     */
    function onResize() {
        VideoLayout.resizeVideoArea();
    }

    // Resize and reposition videos in full screen mode.
    $(document).on(
            'webkitfullscreenchange mozfullscreenchange fullscreenchange',
            onResize);

    $(window).resize(onResize);
};

/**
 * Unbind some DOM event listeners.
 */
UI.unbindEvents = () => {
    $(document).off(
            'webkitfullscreenchange mozfullscreenchange fullscreenchange');

    $(window).off('resize');
};

/**
 * Show local video stream on UI.
 * @param {JitsiTrack} track stream to show
 */
UI.addLocalVideoStream = track => {
    VideoLayout.changeLocalVideo(track);
};

/**
 * Setup and show Etherpad.
 * @param {string} name etherpad id
 */
UI.initEtherpad = name => {
    if (etherpadManager || !config.etherpad_base || !name) {
        return;
    }
    logger.log('Etherpad is enabled');
    etherpadManager
        = new EtherpadManager(config.etherpad_base, name, eventEmitter);

    APP.store.dispatch(setEtherpadHasInitialzied());
};

/**
 * Returns the shared document manager object.
 * @return {EtherpadManager} the shared document manager object
 */
UI.getSharedDocumentManager = () => etherpadManager;

/**
 * Show user on UI.
 * @param {JitsiParticipant} user
 */
UI.addUser = function(user) {
    const id = user.getId();
    const displayName = user.getDisplayName();
    const status = user.getStatus();

    if (status) {
        // FIXME: move updateUserStatus in participantPresenceChanged action
        UI.updateUserStatus(user, status);
    }

    // set initial display name
    if (displayName) {
        UI.changeDisplayName(id, displayName);
    }
};

/**
 * Update videotype for specified user.
 * @param {string} id user id
 * @param {string} newVideoType new videotype
 */
UI.onPeerVideoTypeChanged
    = (id, newVideoType) => VideoLayout.onVideoTypeChanged(id, newVideoType);

/**
 * Update local user role and show notification if user is moderator.
 * @param {boolean} isModerator if local user is moderator or not
 */
UI.updateLocalRole = isModerator => {
    VideoLayout.showModeratorIndicator();

    if (isModerator && !interfaceConfig.DISABLE_FOCUS_INDICATOR) {
        messageHandler.participantNotification(
            null, 'notify.me', 'connected', 'notify.moderator');
    }
};

/**
 * Check the role for the user and reflect it in the UI, moderator ui indication
 * and notifies user who is the moderator
 * @param user to check for moderator
 */
UI.updateUserRole = user => {
    VideoLayout.showModeratorIndicator();

    // We don't need to show moderator notifications when the focus (moderator)
    // indicator is disabled.
    if (!user.isModerator() || interfaceConfig.DISABLE_FOCUS_INDICATOR) {
        return;
    }

    const displayName = user.getDisplayName();

    messageHandler.participantNotification(
        displayName,
        'notify.somebody',
        'connected',
        'notify.grantedTo',
        { to: displayName
            ? UIUtil.escapeHtml(displayName) : '$t(notify.somebody)' });
};

/**
 * Updates the user status.
 *
 * @param {JitsiParticipant} user - The user which status we need to update.
 * @param {string} status - The new status.
 */
UI.updateUserStatus = (user, status) => {
    const reduxState = APP.store.getState() || {};
    const { calleeInfoVisible } = reduxState['features/invite'] || {};

    if (!status || calleeInfoVisible) {
        return;
    }

    const displayName = user.getDisplayName();

    messageHandler.participantNotification(
        displayName,
        '',
        'connected',
        'dialOut.statusMessage',
        { status: UIUtil.escapeHtml(status) });
};

/**
 * Toggles filmstrip.
 */
UI.toggleFilmstrip = function() {
    const { visible } = APP.store.getState()['features/filmstrip'];

    APP.store.dispatch(setFilmstripVisible(!visible));
};

/**
 * Checks if the filmstrip is currently visible or not.
 * @returns {true} if the filmstrip is currently visible, and false otherwise.
 */
UI.isFilmstripVisible = () => Filmstrip.isFilmstripVisible();

/**
 * Toggles the visibility of the chat panel.
 */
UI.toggleChat = () => APP.store.dispatch(toggleChat());

/**
 * Handle new user display name.
 */
UI.inputDisplayNameHandler = function(newDisplayName) {
    eventEmitter.emit(UIEvents.NICKNAME_CHANGED, newDisplayName);
};

/**
 * Return the type of the remote video.
 * @param jid the jid for the remote video
 * @returns the video type video or screen.
 */
UI.getRemoteVideoType = function(jid) {
    return VideoLayout.getRemoteVideoType(jid);
};

// FIXME check if someone user this
UI.showLoginPopup = function(callback) {
    logger.log('password is required');

    const message
        = `<input name="username" type="text"
                placeholder="user@domain.net"
                class="input-control" autofocus>
         <input name="password" type="password"
                data-i18n="[placeholder]dialog.userPassword"
                class="input-control"
                placeholder="user password">`

    ;

    // eslint-disable-next-line max-params
    const submitFunction = (e, v, m, f) => {
        if (v && f.username && f.password) {
            callback(f.username, f.password);
        }
    };

    messageHandler.openTwoButtonDialog({
        titleKey: 'dialog.passwordRequired',
        msgString: message,
        leftButtonKey: 'dialog.Ok',
        submitFunction,
        focus: ':input:first'
    });
};

UI.askForNickname = function() {
    // eslint-disable-next-line no-alert
    return window.prompt('Your nickname (optional)');
};

/**
 * Sets muted audio state for participant
 */
UI.setAudioMuted = function(id, muted) {
    VideoLayout.onAudioMute(id, muted);
    if (APP.conference.isLocalId(id)) {
        APP.conference.updateAudioIconEnabled();
    }
};

/**
 * Sets muted video state for participant
 */
UI.setVideoMuted = function(id, muted) {
    VideoLayout.onVideoMute(id, muted);
    if (APP.conference.isLocalId(id)) {
        APP.conference.updateVideoIconEnabled();
    }
};

/**
 * Triggers an update of remote video and large video displays so they may pick
 * up any state changes that have occurred elsewhere.
 *
 * @returns {void}
 */
UI.updateAllVideos = () => VideoLayout.updateAllVideos();

/**
 * Adds a listener that would be notified on the given type of event.
 *
 * @param type the type of the event we're listening for
 * @param listener a function that would be called when notified
 */
UI.addListener = function(type, listener) {
    eventEmitter.on(type, listener);
};

/**
 * Removes the all listeners for all events.
 *
 * @returns {void}
 */
UI.removeAllListeners = function() {
    eventEmitter.removeAllListeners();
};

/**
 * Removes the given listener for the given type of event.
 *
 * @param type the type of the event we're listening for
 * @param listener the listener we want to remove
 */
UI.removeListener = function(type, listener) {
    eventEmitter.removeListener(type, listener);
};

/**
 * Emits the event of given type by specifying the parameters in options.
 *
 * @param type the type of the event we're emitting
 * @param options the parameters for the event
 */
UI.emitEvent = (type, ...options) => eventEmitter.emit(type, ...options);

UI.clickOnVideo = videoNumber => VideoLayout.togglePin(videoNumber);

// Used by torture.
UI.showToolbar = timeout => APP.store.dispatch(showToolbox(timeout));

// Used by torture.
UI.dockToolbar = dock => APP.store.dispatch(dockToolbox(dock));

/**
 * Updates the displayed avatar for participant.
 *
 * @param {string} id - User id whose avatar should be updated.
 * @param {string} avatarURL - The URL to avatar image to display.
 * @returns {void}
 */
UI.refreshAvatarDisplay = function(id) {
    VideoLayout.changeUserAvatar(id);
};

/**
 * Notify user that connection failed.
 * @param {string} stropheErrorMsg raw Strophe error message
 */
UI.notifyConnectionFailed = function(stropheErrorMsg) {
    let descriptionKey;
    let descriptionArguments;

    if (stropheErrorMsg) {
        descriptionKey = 'dialog.connectErrorWithMsg';
        descriptionArguments = { msg: stropheErrorMsg };
    } else {
        descriptionKey = 'dialog.connectError';
    }

    messageHandler.showError({
        descriptionArguments,
        descriptionKey,
        titleKey: 'connection.CONNFAIL'
    });
};


/**
 * Notify user that maximum users limit has been reached.
 */
UI.notifyMaxUsersLimitReached = function() {
    messageHandler.showError({
        hideErrorSupportLink: true,
        descriptionKey: 'dialog.maxUsersLimitReached',
        titleKey: 'dialog.maxUsersLimitReachedTitle'
    });
};

/**
 * Notify user that he was automatically muted when joned the conference.
 */
UI.notifyInitiallyMuted = function() {
    messageHandler.participantNotification(
        null,
        'notify.mutedTitle',
        'connected',
        'notify.muted',
        null);
};

UI.handleLastNEndpoints = function(leavingIds, enteringIds) {
    VideoLayout.onLastNEndpointsChanged(leavingIds, enteringIds);
};

/**
 * Prompt user for nickname.
 */
UI.promptDisplayName = () => {
    APP.store.dispatch(openDisplayNamePrompt(undefined));
};

/**
 * Update audio level visualization for specified user.
 * @param {string} id user id
 * @param {number} lvl audio level
 */
UI.setAudioLevel = (id, lvl) => VideoLayout.setAudioLevel(id, lvl);

/**
 * Hide connection quality statistics from UI.
 */
UI.hideStats = function() {
    VideoLayout.hideStats();
};


UI.notifyTokenAuthFailed = function() {
    messageHandler.showError({
        descriptionKey: 'dialog.tokenAuthFailed',
        titleKey: 'dialog.tokenAuthFailedTitle'
    });
};

UI.notifyInternalError = function(error) {
    messageHandler.showError({
        descriptionArguments: { error },
        descriptionKey: 'dialog.internalError',
        titleKey: 'dialog.internalErrorTitle'
    });
};

UI.notifyFocusDisconnected = function(focus, retrySec) {
    messageHandler.participantNotification(
        null, 'notify.focus',
        'disconnected', 'notify.focusFail',
        { component: focus,
            ms: retrySec }
    );
};

/**
 * Notifies interested listeners that the raise hand property has changed.
 *
 * @param {boolean} isRaisedHand indicates the current state of the
 * "raised hand"
 */
UI.onLocalRaiseHandChanged = function(isRaisedHand) {
    eventEmitter.emit(UIEvents.LOCAL_RAISE_HAND_CHANGED, isRaisedHand);
};

/**
 * Update list of available physical devices.
 */
UI.onAvailableDevicesChanged = function() {
    APP.conference.updateAudioIconEnabled();
    APP.conference.updateVideoIconEnabled();
};

/**
 * Returns the id of the current video shown on large.
 * Currently used by tests (torture).
 */
UI.getLargeVideoID = function() {
    return VideoLayout.getLargeVideoID();
};

/**
 * Returns the current video shown on large.
 * Currently used by tests (torture).
 */
UI.getLargeVideo = function() {
    return VideoLayout.getLargeVideo();
};

/**
 * Shows "Please go to chrome webstore to install the desktop sharing extension"
 * 2 button dialog with buttons - cancel and go to web store.
 * @param url {string} the url of the extension.
 */
UI.showExtensionExternalInstallationDialog = function(url) {
    let openedWindow = null;

    const submitFunction = function(e, v) {
        if (v) {
            e.preventDefault();
            if (openedWindow === null || openedWindow.closed) {
                openedWindow
                    = window.open(
                        url,
                        'extension_store_window',
                        'resizable,scrollbars=yes,status=1');
            } else {
                openedWindow.focus();
            }
        }
    };

    const closeFunction = function(e, v) {
        if (openedWindow) {
            // Ideally we would close the popup, but this does not seem to work
            // on Chrome. Leaving it uncommented in case it could work
            // in some version.
            openedWindow.close();
            openedWindow = null;
        }
        if (!v) {
            eventEmitter.emit(UIEvents.EXTERNAL_INSTALLATION_CANCELED);
        }
    };

    messageHandler.openTwoButtonDialog({
        titleKey: 'dialog.externalInstallationTitle',
        msgKey: 'dialog.externalInstallationMsg',
        leftButtonKey: 'dialog.goToStore',
        submitFunction,
        loadedFunction: $.noop,
        closeFunction
    });
};

/**
 * Shows a dialog which asks user to install the extension. This one is
 * displayed after installation is triggered from the script, but fails because
 * it must be initiated by user gesture.
 * @param callback {function} function to be executed after user clicks
 * the install button - it should make another attempt to install the extension.
 */
UI.showExtensionInlineInstallationDialog = function(callback) {
    const submitFunction = function(e, v) {
        if (v) {
            callback();
        }
    };

    const closeFunction = function(e, v) {
        if (!v) {
            eventEmitter.emit(UIEvents.EXTERNAL_INSTALLATION_CANCELED);
        }
    };

    messageHandler.openTwoButtonDialog({
        titleKey: 'dialog.externalInstallationTitle',
        msgKey: 'dialog.inlineInstallationMsg',
        leftButtonKey: 'dialog.inlineInstallExtension',
        submitFunction,
        loadedFunction: $.noop,
        closeFunction
    });
};

UI.updateDevicesAvailability = function(id, devices) {
    VideoLayout.setDeviceAvailabilityIcons(id, devices);
};

/**
 * Show shared video.
 * @param {string} id the id of the sender of the command
 * @param {string} url video url
 * @param {string} attributes
*/
UI.onSharedVideoStart = function(id, url, attributes) {
    if (sharedVideoManager) {
        sharedVideoManager.onSharedVideoStart(id, url, attributes);
    }
};

/**
 * Update shared video.
 * @param {string} id the id of the sender of the command
 * @param {string} url video url
 * @param {string} attributes
 */
UI.onSharedVideoUpdate = function(id, url, attributes) {
    if (sharedVideoManager) {
        sharedVideoManager.onSharedVideoUpdate(id, url, attributes);
    }
};

/**
 * Stop showing shared video.
 * @param {string} id the id of the sender of the command
 * @param {string} attributes
 */
UI.onSharedVideoStop = function(id, attributes) {
    if (sharedVideoManager) {
        sharedVideoManager.onSharedVideoStop(id, attributes);
    }
};

/**
 * Handles user's features changes.
 */
UI.onUserFeaturesChanged = user => VideoLayout.onUserFeaturesChanged(user);

/**
 * Returns the number of known remote videos.
 *
 * @returns {number} The number of remote videos.
 */
UI.getRemoteVideosCount = () => VideoLayout.getRemoteVideosCount();

/**
 * Sets the remote control active status for a remote participant.
 *
 * @param {string} participantID - The id of the remote participant.
 * @param {boolean} isActive - The new remote control active status.
 * @returns {void}
 */
UI.setRemoteControlActiveStatus = function(participantID, isActive) {
    VideoLayout.setRemoteControlActiveStatus(participantID, isActive);
};

/**
 * Sets the remote control active status for the local participant.
 *
 * @returns {void}
 */
UI.setLocalRemoteControlActiveChanged = function() {
    VideoLayout.setLocalRemoteControlActiveChanged();
};

// TODO: Export every function separately. For now there is no point of doing
// this because we are importing everything.
export default UI;
