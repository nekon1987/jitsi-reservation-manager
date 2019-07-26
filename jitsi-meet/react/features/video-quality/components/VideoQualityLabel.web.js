// @flow

import Tooltip from '@atlaskit/tooltip';
import React from 'react';

import { translate } from '../../base/i18n';
import { CircularLabel } from '../../base/label';
import { MEDIA_TYPE } from '../../base/media';
import { connect } from '../../base/redux';
import { getTrackByMediaTypeAndParticipant } from '../../base/tracks';

import AbstractVideoQualityLabel, {
    _abstractMapStateToProps,
    type Props as AbstractProps
} from './AbstractVideoQualityLabel';

type Props = AbstractProps & {

    /**
     * The message to show within the label.
     */
    _labelKey: string,

    /**
     * The message to show within the label's tooltip.
     */
    _tooltipKey: string,

    /**
     * The redux representation of the JitsiTrack displayed on large video.
     */
    _videoTrack: Object
};

/**
 * A map of video resolution (number) to translation key.
 *
 * @type {Object}
 */
const RESOLUTION_TO_TRANSLATION_KEY = {
    '720': 'videoStatus.hd',
    '360': 'videoStatus.sd',
    '180': 'videoStatus.ld'
};

/**
 * Expected video resolutions placed into an array, sorted from lowest to
 * highest resolution.
 *
 * @type {number[]}
 */
const RESOLUTIONS
    = Object.keys(RESOLUTION_TO_TRANSLATION_KEY)
        .map(resolution => parseInt(resolution, 10))
        .sort((a, b) => a - b);

/**
 * React {@code Component} responsible for displaying a label that indicates
 * the displayed video state of the current conference. {@code AudioOnlyLabel}
 * will display when the conference is in audio only mode. {@code HDVideoLabel}
 * will display if not in audio only mode and a high-definition large video is
 * being displayed.
 */
export class VideoQualityLabel extends AbstractVideoQualityLabel<Props> {

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            _audioOnly,
            _labelKey,
            _tooltipKey,
            _videoTrack,
            t
        } = this.props;


        let className, labelContent, tooltipKey;

        if (_audioOnly) {
            className = 'audio-only';
            labelContent = t('videoStatus.audioOnly');
            tooltipKey = 'videoStatus.labelTooltipAudioOnly';
        } else if (!_videoTrack || _videoTrack.muted) {
            className = 'no-video';
            labelContent = t('videoStatus.audioOnly');
            tooltipKey = 'videoStatus.labelTooiltipNoVideo';
        } else {
            className = 'current-video-quality';
            labelContent = t(_labelKey);
            tooltipKey = _tooltipKey;
        }


        return (
            <Tooltip
                content = { t(tooltipKey) }
                position = { 'left' }>
                <CircularLabel
                    className = { className }
                    id = 'videoResolutionLabel'
                    label = { labelContent } />
            </Tooltip>
        );
    }
}

/**
 * Matches the passed in resolution with a translation keys for describing
 * the resolution. The passed in resolution will be matched with a known
 * resolution that it is at least greater than or equal to.
 *
 * @param {number} resolution - The video height to match with a
 * translation.
 * @private
 * @returns {Object}
 */
function _mapResolutionToTranslationsKeys(resolution) {
    // Set the default matching resolution of the lowest just in case a match is
    // not found.
    let highestMatchingResolution = RESOLUTIONS[0];

    for (let i = 0; i < RESOLUTIONS.length; i++) {
        const knownResolution = RESOLUTIONS[i];

        if (resolution >= knownResolution) {
            highestMatchingResolution = knownResolution;
        } else {
            break;
        }
    }

    const labelKey
        = RESOLUTION_TO_TRANSLATION_KEY[highestMatchingResolution];

    return {
        labelKey,
        tooltipKey: `${labelKey}Tooltip`
    };
}

/**
 * Maps (parts of) the Redux state to the associated {@code VideoQualityLabel}'s
 * props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _labelKey: string,
 *     _tooltipKey: string,
 *     _videoTrack: Object
 * }}
 */
function _mapStateToProps(state) {
    const { audioOnly } = state['features/base/conference'];
    const { resolution, participantId } = state['features/large-video'];
    const videoTrackOnLargeVideo = getTrackByMediaTypeAndParticipant(
        state['features/base/tracks'],
        MEDIA_TYPE.VIDEO,
        participantId
    );

    const translationKeys
        = audioOnly ? {} : _mapResolutionToTranslationsKeys(resolution);

    return {
        ..._abstractMapStateToProps(state),
        _labelKey: translationKeys.labelKey,
        _tooltipKey: translationKeys.tooltipKey,
        _videoTrack: videoTrackOnLargeVideo
    };
}

export default translate(connect(_mapStateToProps)(VideoQualityLabel));
