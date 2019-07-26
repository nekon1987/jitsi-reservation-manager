// @flow

import { translate } from '../../../base/i18n';
import { MEDIA_TYPE, toggleCameraFacingMode } from '../../../base/media';
import { connect } from '../../../base/redux';
import { AbstractButton } from '../../../base/toolbox';
import type { AbstractButtonProps } from '../../../base/toolbox';
import { isLocalTrackMuted } from '../../../base/tracks';

/**
 * The type of the React {@code Component} props of {@link ToggleCameraButton}.
 */
type Props = AbstractButtonProps & {

    /**
     * Whether the current conference is in audio only mode or not.
     */
    _audioOnly: boolean,

    /**
     * Whether video is currently muted or not.
     */
    _videoMuted: boolean,

    /**
     * The redux {@code dispatch} function.
     */
    dispatch: Function
};

/**
 * An implementation of a button for toggling the camera facing mode.
 */
class ToggleCameraButton extends AbstractButton<Props, *> {
    accessibilityLabel = 'toolbar.accessibilityLabel.toggleCamera';
    iconName = 'icon-switch-camera';
    label = 'toolbar.toggleCamera';

    /**
     * Handles clicking / pressing the button.
     *
     * @override
     * @protected
     * @returns {void}
     */
    _handleClick() {
        this.props.dispatch(toggleCameraFacingMode());
    }

    /**
     * Indicates whether this button is disabled or not.
     *
     * @override
     * @protected
     * @returns {boolean}
     */
    _isDisabled() {
        return this.props._audioOnly || this.props._videoMuted;
    }
}

/**
 * Maps (parts of) the redux state to the associated props for the
 * {@code ToggleCameraButton} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _audioOnly: boolean,
 *     _videoMuted: boolean
 * }}
 */
function _mapStateToProps(state): Object {
    const { audioOnly } = state['features/base/conference'];
    const tracks = state['features/base/tracks'];

    return {
        _audioOnly: Boolean(audioOnly),
        _videoMuted: isLocalTrackMuted(tracks, MEDIA_TYPE.VIDEO)
    };
}

export default translate(connect(_mapStateToProps)(ToggleCameraButton));
