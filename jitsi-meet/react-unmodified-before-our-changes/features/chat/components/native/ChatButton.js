// @flow

import { getLocalParticipant } from '../../../base/participants';
import { connect } from '../../../base/redux';
import {
    AbstractButton,
    type AbstractButtonProps
} from '../../../base/toolbox';
import { openDisplayNamePrompt } from '../../../display-name';

import { toggleChat } from '../../actions';
import { getUnreadCount } from '../../functions';

type Props = AbstractButtonProps & {

    /**
     * Function to display chat.
     *
     * @protected
     */
    _displayChat: Function,

    /**
     * Function to diaply the name prompt before displaying the chat
     * window, if the user has no display name set.
     */
    _displayNameInputDialog: Function,

    /**
     * Whether or not to block chat access with a nickname input form.
     */
    _showNamePrompt: boolean,

    /**
     * The unread message count.
     */
    _unreadMessageCount: number
};

/**
 * Implements an {@link AbstractButton} to open the chat screen on mobile.
 */
class ChatButton extends AbstractButton<Props, *> {
    accessibilityLabel = 'toolbar.accessibilityLabel.chat';
    iconName = 'chat';
    label = 'toolbar.chat';
    toggledIconName = 'chat-unread';

    /**
     * Handles clicking / pressing the button, and opens the appropriate dialog.
     *
     * @private
     * @returns {void}
     */
    _handleClick() {
        if (this.props._showNamePrompt) {
            this.props._displayNameInputDialog(() => {
                this.props._displayChat();
            });
        } else {
            this.props._displayChat();
        }
    }

    /**
     * Renders the button toggled when there are unread messages.
     *
     * @protected
     * @returns {boolean}
     */
    _isToggled() {
        return Boolean(this.props._unreadMessageCount);
    }
}

/**
 * Maps redux actions to the props of the component.
 *
 * @param {Function} dispatch - The redux action {@code dispatch} function.
 * @returns {{
 *     _displayChat,
 *     _displayNameInputDialog
 * }}
 * @private
 */
function _mapDispatchToProps(dispatch: Function) {
    return {
        /**
         * Launches native invite dialog.
         *
         * @private
         * @returns {void}
         */
        _displayChat() {
            dispatch(toggleChat());
        },

        /**
         * Displays a display name prompt.
         *
         * @param {Function} onPostSubmit - The function to invoke after a
         * succesfulsetting of the display name.
         * @returns {void}
         */
        _displayNameInputDialog(onPostSubmit) {
            dispatch(openDisplayNamePrompt(onPostSubmit));
        }
    };
}

/**
 * Maps part of the redux state to the component's props.
 *
 * @param {Object} state - The Redux state.
 * @returns {{
 *     _unreadMessageCount
 * }}
 */
function _mapStateToProps(state) {
    const localParticipant = getLocalParticipant(state);

    return {
        _showNamePrompt: !localParticipant.name,
        _unreadMessageCount: getUnreadCount(state)
    };
}

export default connect(_mapStateToProps, _mapDispatchToProps)(ChatButton);
