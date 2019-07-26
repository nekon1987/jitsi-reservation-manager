/*
 * Copyright @ 2019-present 8x8, Inc.
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

import android.app.Notification;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;


/**
 * This class implements an Android {@link Service}, a foreground one specifically, and it's
 * responsible for presenting an ongoing notification when a conference is in progress.
 * The service will help keep the app running while in the background.
 *
 * See: https://developer.android.com/guide/components/services
 */
public class JitsiMeetOngoingConferenceService extends Service
        implements OngoingConferenceTracker.OngoingConferenceListener {
    private static final String TAG = JitsiMeetOngoingConferenceService.class.getSimpleName();

    static final class Actions {
        static final String START = TAG + ":START";
        static final String HANGUP = TAG + ":HANGUP";
    }

    static void launch(Context context) {
        OngoingNotification.createOngoingConferenceNotificationChannel();

        Intent intent = new Intent(context, JitsiMeetOngoingConferenceService.class);
        intent.setAction(Actions.START);

        ComponentName componentName;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            componentName = context.startForegroundService(intent);
        } else {
            componentName = context.startService(intent);
        }
        if (componentName == null) {
            Log.w(TAG, "Ongoing conference service not started");
        }
    }

    static void abort(Context context) {
        Intent intent = new Intent(context, JitsiMeetOngoingConferenceService.class);
        context.stopService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();

        OngoingConferenceTracker.getInstance().addListener(this);
    }

    @Override
    public void onDestroy() {
        OngoingConferenceTracker.getInstance().removeListener(this);

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        final String action = intent.getAction();
        if (action.equals(Actions.START)) {
            Notification notification = OngoingNotification.buildOngoingConferenceNotification();
            if (notification == null) {
                stopSelf();
                Log.w(TAG, "Couldn't start service, notification is null");
            } else {
                startForeground(OngoingNotification.NOTIFICATION_ID, notification);
                Log.i(TAG, "Service started");
            }
        } else if (action.equals(Actions.HANGUP)) {
            Log.i(TAG, "Hangup requested");
            // Abort all ongoing calls
            if (AudioModeModule.useConnectionService()) {
                ConnectionService.abortConnections();
            }
            stopSelf();
        } else {
            Log.w(TAG, "Unknown action received: " + action);
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    @Override
    public void onCurrentConferenceChanged(String conferenceUrl) {
        if (conferenceUrl == null) {
            stopSelf();
            Log.i(TAG, "Service stopped");
        }
    }
}
