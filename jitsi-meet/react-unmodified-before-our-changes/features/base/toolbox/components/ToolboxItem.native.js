// @flow

import React from 'react';
import { Text, TouchableHighlight, View } from 'react-native';

import { Icon } from '../../../base/font-icons';

import AbstractToolboxItem from './AbstractToolboxItem';
import type { Props } from './AbstractToolboxItem';

/**
 * Native implementation of {@code AbstractToolboxItem}.
 */
export default class ToolboxItem extends AbstractToolboxItem<Props> {
    /**
     * Transform the given (web) icon name into a name that works with
     * {@code Icon}.
     *
     * @private
     * @returns {string}
     */
    _getIconName() {
        const { iconName } = this.props;

        return iconName.replace('icon-', '').split(' ')[0];
    }

    /**
     * Renders the {@code Icon} part of this {@code ToolboxItem}.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderIcon() {
        const { styles } = this.props;

        return (
            <Icon
                name = { this._getIconName() }
                style = { styles && styles.iconStyle } />
        );
    }

    /**
     * Renders this {@code ToolboxItem}. Invoked by {@link AbstractToolboxItem}.
     *
     * @override
     * @protected
     * @returns {ReactElement}
     */
    _renderItem() {
        const {
            disabled,
            elementAfter,
            onClick,
            showLabel,
            styles
        } = this.props;

        let children = this._renderIcon();

        // XXX When using a wrapper View, apply the style to it instead of
        // applying it to the TouchableHighlight.
        let style = styles && styles.style;

        if (showLabel) {
            // XXX TouchableHighlight requires 1 child. If there's a need to
            // show both the icon and the label, then these two need to be
            // wrapped in a View.
            children = (
                <View style = { style }>
                    { children }
                    <Text style = { styles && styles.labelStyle }>
                        { this.label }
                    </Text>
                    { elementAfter }
                </View>
            );

            // XXX As stated earlier, the style was applied to the wrapper View
            // (above).
            style = undefined;
        }

        return (
            <TouchableHighlight
                accessibilityLabel = { this.accessibilityLabel }
                disabled = { disabled }
                onPress = { onClick }
                style = { style }
                underlayColor = { styles && styles.underlayColor } >
                { children }
            </TouchableHighlight>
        );
    }
}
