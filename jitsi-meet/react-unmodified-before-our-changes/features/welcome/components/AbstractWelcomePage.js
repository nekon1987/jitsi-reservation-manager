// @flow

import { generateRoomWithoutSeparator } from 'js-utils/random';
import { Component } from 'react';
import type { Dispatch } from 'redux';

import { createWelcomePageEvent, sendAnalytics } from '../../analytics';
import { appNavigate } from '../../app';
import { isCalendarEnabled } from '../../calendar-sync';
import { isRoomValid } from '../../base/conference';

/**
 * {@code AbstractWelcomePage}'s React {@code Component} prop types.
 */
type Props = {

    /**
     * Whether the calendar functionality is enabled or not.
     */
    _calendarEnabled: boolean,

    /**
     * Room name to join to.
     */
    _room: string,

    /**
     * The current settings.
     */
    _settings: Object,

    /**
     * The Redux dispatch Function.
     */
    dispatch: Dispatch<any>
};

/**
 * Base (abstract) class for container component rendering the welcome page.
 *
 * @abstract
 */
export class AbstractWelcomePage extends Component<Props, *> {
    _mounted: ?boolean;

    /**
     * Implements React's {@link Component#getDerivedStateFromProps()}.
     *
     * @inheritdoc
     */
    static getDerivedStateFromProps(props: Props, state: Object) {
        return {
            room: props._room || state.room
        };
    }

    /**
     * Save room name into component's local state.
     *
     * @type {Object}
     * @property {number|null} animateTimeoutId - Identifier of the letter
     * animation timeout.
     * @property {string} generatedRoomname - Automatically generated room name.
     * @property {string} room - Room name.
     * @property {string} roomPlaceholder - Room placeholder that's used as a
     * placeholder for input.
     * @property {nubmer|null} updateTimeoutId - Identifier of the timeout
     * updating the generated room name.
     */
    state = {
        animateTimeoutId: undefined,
        generatedRoomname: '',
        joining: false,
        room: '',
        roomPlaceholder: '',
        updateTimeoutId: undefined
    };

    /**
     * Initializes a new {@code AbstractWelcomePage} instance.
     *
     * @param {Props} props - The React {@code Component} props to initialize
     * the new {@code AbstractWelcomePage} instance with.
     */
    constructor(props: Props) {
        super(props);

        // Bind event handlers so they are only bound once per instance.
        this._animateRoomnameChanging
            = this._animateRoomnameChanging.bind(this);
        this._onJoin = this._onJoin.bind(this);
        this._onRoomChange = this._onRoomChange.bind(this);
        this._updateRoomname = this._updateRoomname.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}. Invoked
     * immediately after mounting occurs.
     *
     * @inheritdoc
     */
    componentDidMount() {
        this._mounted = true;
    }

    /**
     * Implements React's {@link Component#componentWillUnmount()}. Invoked
     * immediately before this component is unmounted and destroyed.
     *
     * @inheritdoc
     */
    componentWillUnmount() {
        this._clearTimeouts();
        this._mounted = false;
    }

    _animateRoomnameChanging: (string) => void;

    /**
     * Animates the changing of the room name.
     *
     * @param {string} word - The part of room name that should be added to
     * placeholder.
     * @private
     * @returns {void}
     */
    _animateRoomnameChanging(word: string) {
        let animateTimeoutId;
        const roomPlaceholder = this.state.roomPlaceholder + word.substr(0, 1);

        if (word.length > 1) {
            animateTimeoutId
                = setTimeout(
                    () => {
                        this._animateRoomnameChanging(
                            word.substring(1, word.length));
                    },
                    70);
        }
        this.setState({
            animateTimeoutId,
            roomPlaceholder
        });
    }

    /**
     * Method that clears timeouts for animations and updates of room name.
     *
     * @private
     * @returns {void}
     */
    _clearTimeouts() {
        clearTimeout(this.state.animateTimeoutId);
        clearTimeout(this.state.updateTimeoutId);
    }

    /**
     * Determines whether the 'Join' button is (to be) disabled i.e. There's no
     * valid room name typed into the respective text input field.
     *
     * @protected
     * @returns {boolean} If the 'Join' button is (to be) disabled, true;
     * otherwise, false.
     */
    _isJoinDisabled() {
        return this.state.joining || !isRoomValid(this.state.room);
    }

    _onJoin: () => void;

    /**
     * Handles joining. Either by clicking on 'Join' button
     * or by pressing 'Enter' in room name input field.
     *
     * @protected
     * @returns {void}
     */
    _onJoin() {
        const room = this.state.room || this.state.generatedRoomname;

        sendAnalytics(
            createWelcomePageEvent('clicked', 'joinButton', {
                isGenerated: !this.state.room,
                room
            }));

        if (room) {
            this.setState({ joining: true });

            // By the time the Promise of appNavigate settles, this component
            // may have already been unmounted.
            const onAppNavigateSettled
                = () => this._mounted && this.setState({ joining: false });

            this.props.dispatch(appNavigate(encodeURI(room)))
                .then(onAppNavigateSettled, onAppNavigateSettled);
        }
    }

    _onRoomChange: (string) => void;

    /**
     * Handles 'change' event for the room name text input field.
     *
     * @param {string} value - The text typed into the respective text input
     * field.
     * @protected
     * @returns {void}
     */
    _onRoomChange(value: string) {
        this.setState({ room: value });
    }

    _updateRoomname: () => void;

    /**
     * Triggers the generation of a new room name and initiates an animation of
     * its changing.
     *
     * @protected
     * @returns {void}
     */
    _updateRoomname() {
        const generatedRoomname = generateRoomWithoutSeparator();
        const roomPlaceholder = '';
        const updateTimeoutId = setTimeout(this._updateRoomname, 10000);

        this._clearTimeouts();
        this.setState(
            {
                generatedRoomname,
                roomPlaceholder,
                updateTimeoutId
            },
            () => this._animateRoomnameChanging(generatedRoomname));
    }
}

/**
 * Maps (parts of) the redux state to the React {@code Component} props of
 * {@code AbstractWelcomePage}.
 *
 * @param {Object} state - The redux state.
 * @protected
 * @returns {{
 *     _calendarEnabled: boolean,
 *     _room: string,
 *     _settings: Object
 * }}
 */
export function _mapStateToProps(state: Object) {
    return {
        _calendarEnabled: isCalendarEnabled(state),
        _room: state['features/base/conference'].room,
        _settings: state['features/base/settings']
    };
}
