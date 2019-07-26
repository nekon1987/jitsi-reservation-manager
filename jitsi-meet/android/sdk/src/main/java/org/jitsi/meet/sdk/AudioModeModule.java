/*
 * Copyright @ 2017-present Atlassian Pty Ltd
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

import android.annotation.TargetApi;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.support.annotation.RequiresApi;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Module implementing a simple API to select the appropriate audio device for a
 * conference call.
 *
 * Audio calls should use {@code AudioModeModule.AUDIO_CALL}, which uses the
 * builtin earpiece, wired headset or bluetooth headset. The builtin earpiece is
 * the default audio device.
 *
 * Video calls should should use {@code AudioModeModule.VIDEO_CALL}, which uses
 * the builtin speaker, earpiece, wired headset or bluetooth headset. The
 * builtin speaker is the default audio device.
 *
 * Before a call has started and after it has ended the
 * {@code AudioModeModule.DEFAULT} mode should be used.
 */
@ReactModule(name = AudioModeModule.NAME)
class AudioModeModule extends ReactContextBaseJavaModule
    implements AudioManager.OnAudioFocusChangeListener {

    public static final String NAME = "AudioMode";

    /**
     * Constants representing the audio mode.
     * - DEFAULT: Used before and after every call. It represents the default
     *   audio routing scheme.
     * - AUDIO_CALL: Used for audio only calls. It will use the earpiece by
     *   default, unless a wired or Bluetooth headset is connected.
     * - VIDEO_CALL: Used for video calls. It will use the speaker by default,
     *   unless a wired or Bluetooth headset is connected.
     */
    private static final int DEFAULT    = 0;
    private static final int AUDIO_CALL = 1;
    private static final int VIDEO_CALL = 2;

    /**
     * Constant defining the action for plugging in a headset. This is used on
     * our device detection system for API < 23.
     */
    private static final String ACTION_HEADSET_PLUG
        = (Build.VERSION.SDK_INT >= 21)
            ? AudioManager.ACTION_HEADSET_PLUG
            : Intent.ACTION_HEADSET_PLUG;

    /**
     * Constant defining a USB headset. Only available on API level >= 26.
     * The value of: AudioDeviceInfo.TYPE_USB_HEADSET
     */
    private static final int TYPE_USB_HEADSET = 22;

    /**
     * The {@code Log} tag {@code AudioModeModule} is to log messages with.
     */
    static final String TAG = NAME;

    /**
     * Converts any of the "DEVICE_" constants into the corresponding
     * {@link android.telecom.CallAudioState} "ROUTE_" number.
     *
     * @param audioDevice one of the "DEVICE_" constants.
     * @return a route number {@link android.telecom.CallAudioState#ROUTE_EARPIECE} if
     * no match is found.
     */
    @RequiresApi(api = Build.VERSION_CODES.M)
    private static int audioDeviceToRouteInt(String audioDevice) {
        if (audioDevice == null) {
            return android.telecom.CallAudioState.ROUTE_EARPIECE;
        }
        switch (audioDevice) {
            case DEVICE_BLUETOOTH:
                return android.telecom.CallAudioState.ROUTE_BLUETOOTH;
            case DEVICE_EARPIECE:
                return android.telecom.CallAudioState.ROUTE_EARPIECE;
            case DEVICE_HEADPHONES:
                return android.telecom.CallAudioState.ROUTE_WIRED_HEADSET;
            case DEVICE_SPEAKER:
                return android.telecom.CallAudioState.ROUTE_SPEAKER;
            default:
                Log.e(TAG, "Unsupported device name: " + audioDevice);
                return android.telecom.CallAudioState.ROUTE_EARPIECE;
        }
    }

    /**
     * Populates given route mask into the "DEVICE_" list.
     *
     * @param supportedRouteMask an integer coming from
     * {@link android.telecom.CallAudioState#getSupportedRouteMask()}.
     * @return a list of device names.
     */
    @RequiresApi(api = Build.VERSION_CODES.M)
    private static Set<String> routesToDeviceNames(int supportedRouteMask) {
        Set<String> devices = new HashSet<>();
        if ((supportedRouteMask & android.telecom.CallAudioState.ROUTE_EARPIECE)
                == android.telecom.CallAudioState.ROUTE_EARPIECE) {
            devices.add(DEVICE_EARPIECE);
        }
        if ((supportedRouteMask & android.telecom.CallAudioState.ROUTE_BLUETOOTH)
                == android.telecom.CallAudioState.ROUTE_BLUETOOTH) {
            devices.add(DEVICE_BLUETOOTH);
        }
        if ((supportedRouteMask & android.telecom.CallAudioState.ROUTE_SPEAKER)
                == android.telecom.CallAudioState.ROUTE_SPEAKER) {
            devices.add(DEVICE_SPEAKER);
        }
        if ((supportedRouteMask & android.telecom.CallAudioState.ROUTE_WIRED_HEADSET)
                == android.telecom.CallAudioState.ROUTE_WIRED_HEADSET) {
            devices.add(DEVICE_HEADPHONES);
        }
        return devices;
    }

    /**
     * Whether or not the ConnectionService is used for selecting audio devices.
     */
    static boolean useConnectionService() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O;
    }

    /**
     * Indicator that we have lost audio focus.
     */
    private boolean audioFocusLost = false;

    /**
     * {@link AudioManager} instance used to interact with the Android audio
     * subsystem.
     */
    private final AudioManager audioManager;

    /**
     * {@link BluetoothHeadsetMonitor} for detecting Bluetooth device changes in
     * old (< M) Android versions.
     */
    private BluetoothHeadsetMonitor bluetoothHeadsetMonitor;

    /**
     * {@link ExecutorService} for running all audio operations on a dedicated
     * thread.
     */
    private static final ExecutorService executor
        = Executors.newSingleThreadExecutor();

    /**
     * {@link Runnable} for running audio device detection the main thread.
     * This is only used on Android >= M.
     */
    private final Runnable onAudioDeviceChangeRunner = new Runnable() {
        @TargetApi(Build.VERSION_CODES.M)
        @Override
        public void run() {
            Set<String> devices = new HashSet<>();
            AudioDeviceInfo[] deviceInfos
                = audioManager.getDevices(AudioManager.GET_DEVICES_ALL);

            for (AudioDeviceInfo info: deviceInfos) {
                switch (info.getType()) {
                case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:
                    devices.add(DEVICE_BLUETOOTH);
                    break;
                case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE:
                    devices.add(DEVICE_EARPIECE);
                    break;
                case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER:
                    devices.add(DEVICE_SPEAKER);
                    break;
                case AudioDeviceInfo.TYPE_WIRED_HEADPHONES:
                case AudioDeviceInfo.TYPE_WIRED_HEADSET:
                case TYPE_USB_HEADSET:
                    devices.add(DEVICE_HEADPHONES);
                    break;
                }
            }

            availableDevices = devices;
            Log.d(TAG, "Available audio devices: " +
                availableDevices.toString());

            // Reset user selection
            userSelectedDevice = null;

            if (mode != -1) {
                updateAudioRoute(mode);
            }
        }
    };

    /**
     * {@link Runnable} for running update operation on the main thread.
     */
    private final Runnable updateAudioRouteRunner
        = new Runnable() {
            @Override
            public void run() {
                if (mode != -1) {
                    updateAudioRoute(mode);
                }
            }
        };

    /**
     * Audio mode currently in use.
     */
    private int mode = -1;

    /**
     * Audio device types.
     */
    private static final String DEVICE_BLUETOOTH  = "BLUETOOTH";
    private static final String DEVICE_EARPIECE   = "EARPIECE";
    private static final String DEVICE_HEADPHONES = "HEADPHONES";
    private static final String DEVICE_SPEAKER    = "SPEAKER";

    /**
     * List of currently available audio devices.
     */
    private Set<String> availableDevices = new HashSet<>();

    /**
     * Currently selected device.
     */
    private String selectedDevice;

    /**
     * Used on API >= 26 to store the most recently reported audio devices.
     * Makes it easier to compare for a change, because the devices are stored
     * as a mask in the {@link android.telecom.CallAudioState}. The mask is populated into
     * the {@link #availableDevices} on each update.
     */
    @RequiresApi(api = Build.VERSION_CODES.O)
    private int supportedRouteMask;

    /**
     * User selected device. When null the default is used depending on the
     * mode.
     */
    private String userSelectedDevice;

    /**
     * Initializes a new module instance. There shall be a single instance of
     * this module throughout the lifetime of the application.
     *
     * @param reactContext the {@link ReactApplicationContext} where this module
     * is created.
     */
    public AudioModeModule(ReactApplicationContext reactContext) {
        super(reactContext);

        audioManager
            = (AudioManager)
                reactContext.getSystemService(Context.AUDIO_SERVICE);

        // Starting Oreo the ConnectionImpl from ConnectionService is used to
        // detect the available devices.
        if (!useConnectionService()) {
            // Setup runtime device change detection.
            setupAudioRouteChangeDetection();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Do an initial detection on Android >= M.
                runInAudioThread(onAudioDeviceChangeRunner);
            } else {
                // On Android < M, detect if we have an earpiece.
                PackageManager pm = reactContext.getPackageManager();
                if (pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)) {
                    availableDevices.add(DEVICE_EARPIECE);
                }

                // Always assume there is a speaker.
                availableDevices.add(DEVICE_SPEAKER);
            }
        }
    }

    /**
     * Gets a mapping with the constants this module is exporting.
     *
     * @return a {@link Map} mapping the constants to be exported with their
     * values.
     */
    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();

        constants.put("AUDIO_CALL", AUDIO_CALL);
        constants.put("DEFAULT", DEFAULT);
        constants.put("VIDEO_CALL", VIDEO_CALL);

        return constants;
    }

    /**
     * Gets the list of available audio device categories, i.e. 'bluetooth',
     * 'earpiece ', 'speaker', 'headphones'.
     *
     * @param promise a {@link Promise} which will be resolved with an object
     *                containing a 'devices' key with a list of devices, plus a
     *                'selected' key with the selected one.
     */
    @ReactMethod
    public void getAudioDevices(final Promise promise) {
        runInAudioThread(new Runnable() {
            @Override
            public void run() {
                WritableMap map = Arguments.createMap();
                map.putString("selected", selectedDevice);
                WritableArray devices = Arguments.createArray();
                for (String device : availableDevices) {
                    if (mode == VIDEO_CALL && device.equals(DEVICE_EARPIECE)) {
                        // Skip earpiece when in video call mode.
                        continue;
                    }
                    devices.pushString(device);
                }
                map.putArray("devices", devices);

                promise.resolve(map);
            }
        });
    }

    /**
     * Gets the name for this module to be used in the React Native bridge.
     *
     * @return a string with the module name.
     */
    @Override
    public String getName() {
        return NAME;
    }

    /**
     * Helper method to trigger an audio route update when devices change. It
     * makes sure the operation is performed on the main thread.
     *
     * Only used on Android >= M.
     */
    void onAudioDeviceChange() {
        runInAudioThread(onAudioDeviceChangeRunner);
    }

    /**
     * Helper method to trigger an audio route update when Bluetooth devices are
     * connected / disconnected.
     *
     * Only used on Android < M. Runs on the main thread.
     */
    void onBluetoothDeviceChange() {
        if (bluetoothHeadsetMonitor != null && bluetoothHeadsetMonitor.isHeadsetAvailable()) {
            availableDevices.add(DEVICE_BLUETOOTH);
        } else {
            availableDevices.remove(DEVICE_BLUETOOTH);
        }

        if (mode != -1) {
            updateAudioRoute(mode);
        }
    }

    /**
     * Helper method to trigger an audio route update when a headset is plugged
     * or unplugged.
     *
     * Only used on Android < M.
     */
    void onHeadsetDeviceChange() {
        runInAudioThread(new Runnable() {
            @Override
            public void run() {
                // XXX: isWiredHeadsetOn is not deprecated when used just for
                // knowing if there is a wired headset connected, regardless of
                // audio being routed to it.
                //noinspection deprecation
                if (audioManager.isWiredHeadsetOn()) {
                    availableDevices.add(DEVICE_HEADPHONES);
                } else {
                    availableDevices.remove(DEVICE_HEADPHONES);
                }

                if (mode != -1) {
                    updateAudioRoute(mode);
                }
            }
        });
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    void onCallAudioStateChange(Object callAudioState_) {
        final android.telecom.CallAudioState callAudioState
            = (android.telecom.CallAudioState)callAudioState_;
        runInAudioThread(new Runnable() {
            @Override
            public void run() {
                int newSupportedRoutes = callAudioState.getSupportedRouteMask();
                boolean audioDevicesChanged
                        = supportedRouteMask != newSupportedRoutes;
                if (audioDevicesChanged) {
                    supportedRouteMask = newSupportedRoutes;
                    availableDevices = routesToDeviceNames(supportedRouteMask);
                    Log.d(TAG,
                          "Available audio devices: "
                                  + availableDevices.toString());
                }

                boolean audioRouteChanged
                    = audioDeviceToRouteInt(selectedDevice)
                            != callAudioState.getRoute();

                if (audioRouteChanged || audioDevicesChanged) {
                    // Reset user selection
                    userSelectedDevice = null;

                    // If the OS changes the Audio Route or Devices we could have lost
                    // the selected audio device
                    selectedDevice = null;

                    if (mode != -1) {
                        updateAudioRoute(mode);
                    }
                }
            }
        });
    }

    /**
     * {@link AudioManager.OnAudioFocusChangeListener} interface method. Called
     * when the audio focus of the system is updated.
     *
     * @param focusChange - The type of focus change.
     */
    @Override
    public void onAudioFocusChange(int focusChange) {
        switch (focusChange) {
        case AudioManager.AUDIOFOCUS_GAIN: {
            Log.d(TAG, "Audio focus gained");
            // Some other application potentially stole our audio focus
            // temporarily. Restore our mode.
            if (audioFocusLost) {
                updateAudioRoute(mode);
            }
            audioFocusLost = false;
            break;
        }
        case AudioManager.AUDIOFOCUS_LOSS:
        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
        case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK: {
            Log.d(TAG, "Audio focus lost");
            audioFocusLost = true;
            break;
        }

        }
    }

    /**
     * Helper function to run operations on a dedicated thread.
     * @param runnable
     */
    public void runInAudioThread(Runnable runnable) {
        executor.execute(runnable);
    }

    /**
     * Sets the user selected audio device as the active audio device.
     *
     * @param device the desired device which will become active.
     */
    @ReactMethod
    public void setAudioDevice(final String device) {
        runInAudioThread(new Runnable() {
            @Override
            public void run() {
                if (!availableDevices.contains(device)) {
                    Log.d(TAG, "Audio device not available: " + device);
                    userSelectedDevice = null;
                    return;
                }

                if (mode != -1) {
                    Log.d(TAG, "User selected device set to: " + device);
                    userSelectedDevice = device;
                    updateAudioRoute(mode);
                }
            }
        });
    }

    /**
     * The API >= 26 way of adjusting the audio route.
     *
     * @param audioDevice one of the "DEVICE_" names to set as the audio route.
     */
    @RequiresApi(api = Build.VERSION_CODES.O)
    private void setAudioRoute(String audioDevice) {
        int newAudioRoute = audioDeviceToRouteInt(audioDevice);

        RNConnectionService.setAudioRoute(newAudioRoute);
    }

    /**
     * The API < 26 way of adjusting the audio route.
     *
     * @param audioDevice one of the "DEVICE_" names to set as the audio route.
     */
    private void setAudioRoutePreO(String audioDevice) {
        // Turn bluetooth on / off
        setBluetoothAudioRoute(audioDevice.equals(DEVICE_BLUETOOTH));

        // Turn speaker on / off
        audioManager.setSpeakerphoneOn(audioDevice.equals(DEVICE_SPEAKER));
    }

    /**
     * Helper method to set the output route to a Bluetooth device.
     *
     * @param enabled true if Bluetooth should use used, false otherwise.
     */
    private void setBluetoothAudioRoute(boolean enabled) {
        if (enabled) {
            audioManager.startBluetoothSco();
            audioManager.setBluetoothScoOn(true);
        } else {
            audioManager.setBluetoothScoOn(false);
            audioManager.stopBluetoothSco();
        }
    }

    /**
     * Public method to set the current audio mode.
     *
     * @param mode the desired audio mode.
     * @param promise a {@link Promise} which will be resolved if the audio mode
     * could be updated successfully, and it will be rejected otherwise.
     */
    @ReactMethod
    public void setMode(final int mode, final Promise promise) {
        if (mode != DEFAULT && mode != AUDIO_CALL && mode != VIDEO_CALL) {
            promise.reject("setMode", "Invalid audio mode " + mode);
            return;
        }

        Runnable r = new Runnable() {
            @Override
            public void run() {
                boolean success;

                try {
                    success = updateAudioRoute(mode);
                } catch (Throwable e) {
                    success = false;
                    Log.e(
                            TAG,
                            "Failed to update audio route for mode: " + mode,
                            e);
                }
                if (success) {
                    AudioModeModule.this.mode = mode;
                    promise.resolve(null);
                } else {
                    promise.reject(
                            "setMode",
                            "Failed to set audio mode to " + mode);
                }
            }
        };
        runInAudioThread(r);
    }

    /**
     * Setup the audio route change detection mechanism. We use the
     * {@link android.media.AudioDeviceCallback} on 23 >= Android API < 26.
     */
    private void setupAudioRouteChangeDetection() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            setupAudioRouteChangeDetectionM();
        } else {
            setupAudioRouteChangeDetectionPreM();
        }
    }

    /**
     * Audio route change detection mechanism for 23 >= Android API < 26.
     */
    @TargetApi(Build.VERSION_CODES.M)
    private void setupAudioRouteChangeDetectionM() {
        android.media.AudioDeviceCallback audioDeviceCallback =
                new android.media.AudioDeviceCallback() {
                    @Override
                    public void onAudioDevicesAdded(
                            AudioDeviceInfo[] addedDevices) {
                        Log.d(TAG, "Audio devices added");
                        onAudioDeviceChange();
                    }

                    @Override
                    public void onAudioDevicesRemoved(
                            AudioDeviceInfo[] removedDevices) {
                        Log.d(TAG, "Audio devices removed");
                        onAudioDeviceChange();
                    }
                };

        audioManager.registerAudioDeviceCallback(audioDeviceCallback, null);
    }

    /**
     * Audio route change detection mechanism for Android API < 23.
     */
    private void setupAudioRouteChangeDetectionPreM() {
        Context context = getReactApplicationContext();

        // Detect changes in wired headset connections.
        IntentFilter wiredHeadSetFilter = new IntentFilter(ACTION_HEADSET_PLUG);
        BroadcastReceiver wiredHeadsetReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "Wired headset added / removed");
                onHeadsetDeviceChange();
            }
        };
        context.registerReceiver(wiredHeadsetReceiver, wiredHeadSetFilter);

        // Detect Bluetooth device changes.
        bluetoothHeadsetMonitor = new BluetoothHeadsetMonitor(this, context);
    }

    /**
     * Updates the audio route for the given mode.
     *
     * @param mode the audio mode to be used when computing the audio route.
     * @return {@code true} if the audio route was updated successfully;
     * {@code false}, otherwise.
     */
    private boolean updateAudioRoute(int mode) {
        Log.d(TAG, "Update audio route for mode: " + mode);

        if (mode == DEFAULT) {
            if (!useConnectionService()) {
                audioFocusLost = false;
                audioManager.setMode(AudioManager.MODE_NORMAL);
                audioManager.abandonAudioFocus(this);
                audioManager.setSpeakerphoneOn(false);
                setBluetoothAudioRoute(false);
            }
            selectedDevice = null;
            userSelectedDevice = null;

            return true;
        }

        if (!useConnectionService()) {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setMicrophoneMute(false);

            if (audioManager.requestAudioFocus(
                    this,
                    AudioManager.STREAM_VOICE_CALL,
                    AudioManager.AUDIOFOCUS_GAIN)
                    == AudioManager.AUDIOFOCUS_REQUEST_FAILED) {
                Log.d(TAG, "Audio focus request failed");
                return false;
            }
        }

        boolean bluetoothAvailable = availableDevices.contains(DEVICE_BLUETOOTH);
        boolean earpieceAvailable = availableDevices.contains(DEVICE_EARPIECE);
        boolean headsetAvailable = availableDevices.contains(DEVICE_HEADPHONES);

        // Pick the desired device based on what's available and the mode.
        String audioDevice;
        if (bluetoothAvailable) {
            audioDevice = DEVICE_BLUETOOTH;
        } else if (headsetAvailable) {
            audioDevice = DEVICE_HEADPHONES;
        } else if (mode == AUDIO_CALL && earpieceAvailable) {
            audioDevice = DEVICE_EARPIECE;
        } else {
            audioDevice = DEVICE_SPEAKER;
        }

        // Consider the user's selection
        if (userSelectedDevice != null
                && availableDevices.contains(userSelectedDevice)) {
            audioDevice = userSelectedDevice;
        }

        // If the previously selected device and the current default one
        // match, do nothing.
        if (selectedDevice != null && selectedDevice.equals(audioDevice)) {
            return true;
        }

        selectedDevice = audioDevice;
        Log.d(TAG, "Selected audio device: " + audioDevice);

        if (useConnectionService()) {
            setAudioRoute(audioDevice);
        } else {
            setAudioRoutePreO(audioDevice);
        }

        return true;
    }
}
