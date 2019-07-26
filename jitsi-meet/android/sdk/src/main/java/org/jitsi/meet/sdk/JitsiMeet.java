/*
 * Copyright @ 2018-present 8x8, Inc.
 * Copyright @ 2017-2018 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jitsi.meet.sdk;

import android.os.Bundle;

import com.facebook.react.ReactInstanceManager;

public class JitsiMeet {
    /**
     * Default {@link JitsiMeetConferenceOptions} which will be used for all conferences. When
     * joining a conference these options will be merged with the ones passed to
     * {@link JitsiMeetView} join().
     */
    private static JitsiMeetConferenceOptions defaultConferenceOptions;

    public static JitsiMeetConferenceOptions getDefaultConferenceOptions() {
        return defaultConferenceOptions;
    }

    public static void setDefaultConferenceOptions(JitsiMeetConferenceOptions options) {
        defaultConferenceOptions = options;
    }

    /**
     * Returns the current conference URL as a string.
     *
     * @return the current conference URL.
     */
    public static String getCurrentConference() {
        return OngoingConferenceTracker.getInstance().getCurrentConference();
    }

    /**
     * Helper to get the default conference options as a {@link Bundle}.
     *
     * @return a {@link Bundle} with the default conference options.
     */
    static Bundle getDefaultProps() {
        if (defaultConferenceOptions != null) {
            return defaultConferenceOptions.asProps();
        }

        return new Bundle();
    }

    /**
     * Used in development mode. It displays the React Native development menu.
     */
    public static void showDevOptions() {
        ReactInstanceManager reactInstanceManager
            = ReactInstanceManagerHolder.getReactInstanceManager();

        if (reactInstanceManager != null) {
            reactInstanceManager.showDevOptionsDialog();
        }
    }
}
