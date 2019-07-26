/* @flow */

import React, { Component } from 'react';
import Tooltip from '@atlaskit/tooltip';

import { translate } from '../../../i18n';

/**
 * The type of the React {@code Component} props of {@link BaseIndicator}.
 */
type Props = {

    /**
     * Additional CSS class names to set on the icon container.
     */
    className: string,

    /**
     * The CSS classnames to set on the icon element of the component.
     */
    iconClassName: string,

    /**
     * The font size for the icon.
     */
    iconSize: string,

    /**
     * The ID attribue to set on the root element of the component.
     */
    id: string,

    /**
     * Invoked to obtain translated strings.
     */
    t: Function,

    /**
     * The translation key to use for displaying a tooltip when hovering over
     * the component.
     */
    tooltipKey: string,

    /**
     * From which side of the indicator the tooltip should appear from,
     * defaulting to "top".
     */
    tooltipPosition: string
};

/**
 * React {@code Component} for showing an icon with a tooltip.
 *
 * @extends Component
 */
class BaseIndicator extends Component<Props> {
    /**
     * Default values for {@code BaseIndicator} component's properties.
     *
     * @static
     */
    static defaultProps = {
        className: '',
        iconClassName: '',
        iconSize: 'auto',
        id: '',
        tooltipPosition: 'top'
    };

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    render() {
        const {
            className,
            iconClassName,
            iconSize,
            id,
            t,
            tooltipKey,
            tooltipPosition
        } = this.props;

        const iconContainerClassName = `indicator-icon-container ${className}`;

        return (
            <div className = 'indicator-container'>
                <Tooltip
                    content = { t(tooltipKey) }
                    position = { tooltipPosition }>
                    <span
                        className = { iconContainerClassName }
                        id = { id }>
                        <i
                            className = { iconClassName }
                            style = {{ fontSize: iconSize }} />
                    </span>
                </Tooltip>
            </div>
        );
    }
}

export default translate(BaseIndicator);
