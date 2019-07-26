// @flow

import { AtlasKitThemeProvider } from '@atlaskit/theme';
import React from 'react';

import { DialogContainer } from '../../base/dialog';
import '../../base/user-interaction';
import '../../base/responsive-ui';
import '../../chat';
import '../../external-api';
import '../../power-monitor';
import '../../room-lock';
import '../../talk-while-muted';
import '../../video-layout';

import { AbstractApp } from './AbstractApp';

/**
 * Root app {@code Component} on Web/React.
 *
 * @extends AbstractApp
 */
export class App extends AbstractApp {
    /**
     * Overrides the parent method to inject {@link AtlasKitThemeProvider} as
     * the top most component.
     *
     * @override
     */
    _createMainElement(component, props) {
        return (
            <AtlasKitThemeProvider mode = 'dark'>
                { super._createMainElement(component, props) }
            </AtlasKitThemeProvider>
        );
    }

    /**
     * Renders the platform specific dialog container.
     *
     * @returns {React$Element}
     */
    _renderDialogContainer() {
        return (
            <AtlasKitThemeProvider mode = 'dark'>
                <DialogContainer />
            </AtlasKitThemeProvider>
        );
    }
}
