// @flow

import { i18next } from '../base/i18n';
import { isLocalParticipantModerator } from '../base/participants';
import { doGetJSON, parseURIString } from '../base/util';

declare var $: Function;
declare var interfaceConfig: Object;

const logger = require('jitsi-meet-logger').getLogger(__filename);

/**
 * Sends an ajax request to check if the phone number can be called.
 *
 * @param {string} dialNumber - The dial number to check for validity.
 * @param {string} dialOutAuthUrl - The endpoint to use for checking validity.
 * @returns {Promise} - The promise created by the request.
 */
export function checkDialNumber(
        dialNumber: string,
        dialOutAuthUrl: string
): Promise<Object> {
    const fullUrl = `${dialOutAuthUrl}?phone=${dialNumber}`;

    return new Promise((resolve, reject) => {
        $.getJSON(fullUrl)
            .then(resolve)
            .catch(reject);
    });
}

/**
 * Sends a GET request to obtain the conference ID necessary for identifying
 * which conference to join after diaing the dial-in service.
 *
 * @param {string} baseUrl - The url for obtaining the conference ID (pin) for
 * dialing into a conference.
 * @param {string} roomName - The conference name to find the associated
 * conference ID.
 * @param {string} mucURL - In which MUC the conference exists.
 * @returns {Promise} - The promise created by the request.
 */
export function getDialInConferenceID(
        baseUrl: string,
        roomName: string,
        mucURL: string
): Promise<Object> {

    const conferenceIDURL = `${baseUrl}?conference=${roomName}@${mucURL}`;

    return doGetJSON(conferenceIDURL);
}

/**
 * Sends a GET request for phone numbers used to dial into a conference.
 *
 * @param {string} url - The service that returns conference dial-in numbers.
 * @param {string} roomName - The conference name to find the associated
 * conference ID.
 * @param {string} mucURL - In which MUC the conference exists.
 * @returns {Promise} - The promise created by the request. The returned numbers
 * may be an array of Objects containing numbers, with keys countryCode,
 * tollFree, formattedNumber or an object with countries as keys and arrays of
 * phone number strings, as the second one should not be used and is deprecated.
 */
export function getDialInNumbers(
        url: string,
        roomName: string,
        mucURL: string
): Promise<*> {

    const fullUrl = `${url}?conference=${roomName}@${mucURL}`;

    return doGetJSON(fullUrl);
}

/**
 * Removes all non-numeric characters from a string.
 *
 * @param {string} text - The string from which to remove all characters except
 * numbers.
 * @returns {string} A string with only numbers.
 */
export function getDigitsOnly(text: string = ''): string {
    return text.replace(/\D/g, '');
}

/**
 * Type of the options to use when sending a search query.
 */
export type GetInviteResultsOptions = {

    /**
     * The endpoint to use for checking phone number validity.
     */
    dialOutAuthUrl: string,

    /**
     * Whether or not to search for people.
     */
    addPeopleEnabled: boolean,

    /**
     * Whether or not to check phone numbers.
     */
    dialOutEnabled: boolean,

    /**
     * Array with the query types that will be executed -
     * "conferenceRooms" | "user" | "room".
     */
    peopleSearchQueryTypes: Array<string>,

    /**
     * The url to query for people.
     */
    peopleSearchUrl: string,

    /**
     * The jwt token to pass to the search service.
     */
    jwt: string
};

/**
 * Combines directory search with phone number validation to produce a single
 * set of invite search results.
 *
 * @param {string} query - Text to search.
 * @param {GetInviteResultsOptions} options - Options to use when searching.
 * @returns {Promise<*>}
 */
export function getInviteResultsForQuery(
        query: string,
        options: GetInviteResultsOptions
): Promise<*> {

    const text = query.trim();

    const {
        dialOutAuthUrl,
        addPeopleEnabled,
        dialOutEnabled,
        peopleSearchQueryTypes,
        peopleSearchUrl,
        jwt
    } = options;

    let peopleSearchPromise;

    if (addPeopleEnabled && text) {
        peopleSearchPromise = searchDirectory(
            peopleSearchUrl,
            jwt,
            text,
            peopleSearchQueryTypes);
    } else {
        peopleSearchPromise = Promise.resolve([]);
    }


    let hasCountryCode = text.startsWith('+');
    let phoneNumberPromise;

    // Phone numbers are handled a specially to enable both cases of restricting
    // numbers to telephone number-y numbers and accepting any arbitrary string,
    // which may be valid for SIP (jigasi) calls. If the dialOutAuthUrl is
    // defined, then it is assumed the call is to a telephone number and
    // some validation of the number is completed, with the + sign used as a way
    // for the UI to detect and enforce the usage of a country code. If the
    // dialOutAuthUrl is not defined, accept anything because this is assumed
    // to be the SIP (jigasi) case.
    if (dialOutEnabled && dialOutAuthUrl && isMaybeAPhoneNumber(text)) {
        let numberToVerify = text;

        // When the number to verify does not start with a +, we assume no
        // proper country code has been entered. In such a case, prepend 1 for
        // the country code. The service currently takes care of prepending the
        // +.
        if (!hasCountryCode && !text.startsWith('1')) {
            numberToVerify = `1${numberToVerify}`;
        }

        // The validation service works properly when the query is digits only
        // so ensure only digits get sent.
        numberToVerify = getDigitsOnly(numberToVerify);

        phoneNumberPromise = checkDialNumber(numberToVerify, dialOutAuthUrl);
    } else if (dialOutEnabled && !dialOutAuthUrl) {
        // fake having a country code to hide the country code reminder
        hasCountryCode = true;

        // With no auth url, let's say the text is a valid number
        phoneNumberPromise = Promise.resolve({
            allow: true,
            country: '',
            phone: text
        });
    } else {
        phoneNumberPromise = Promise.resolve({});
    }

    return Promise.all([ peopleSearchPromise, phoneNumberPromise ])
        .then(([ peopleResults, phoneResults ]) => {
            const results = [
                ...peopleResults
            ];

            /**
             * This check for phone results is for the day the call to searching
             * people might return phone results as well. When that day comes
             * this check will make it so the server checks are honored and the
             * local appending of the number is not done. The local appending of
             * the phone number can then be cleaned up when convenient.
             */
            const hasPhoneResult
                = peopleResults.find(result => result.type === 'phone');

            if (!hasPhoneResult && typeof phoneResults.allow === 'boolean') {
                results.push({
                    allowed: phoneResults.allow,
                    country: phoneResults.country,
                    type: 'phone',
                    number: phoneResults.phone,
                    originalEntry: text,
                    showCountryCodeReminder: !hasCountryCode
                });
            }

            return results;
        });
}

/**
 * Helper for determining how many of each type of user is being invited. Used
 * for logging and sending analytics related to invites.
 *
 * @param {Array} inviteItems - An array with the invite items, as created in
 * {@link _parseQueryResults}.
 * @returns {Object} An object with keys as user types and values as the number
 * of invites for that type.
 */
export function getInviteTypeCounts(inviteItems: Array<Object> = []) {
    const inviteTypeCounts = {};

    inviteItems.forEach(({ type }) => {
        if (!inviteTypeCounts[type]) {
            inviteTypeCounts[type] = 0;
        }
        inviteTypeCounts[type]++;
    });

    return inviteTypeCounts;
}

/**
 * Sends a post request to an invite service.
 *
 * @param {string} inviteServiceUrl - The invite service that generates the
 * invitation.
 * @param {string} inviteUrl - The url to the conference.
 * @param {string} jwt - The jwt token to pass to the search service.
 * @param {Immutable.List} inviteItems - The list of the "user" or "room" type
 * items to invite.
 * @returns {Promise} - The promise created by the request.
 */
export function invitePeopleAndChatRooms( // eslint-disable-line max-params
        inviteServiceUrl: string,
        inviteUrl: string,
        jwt: string,
        inviteItems: Array<Object>
): Promise<void> {

    if (!inviteItems || inviteItems.length === 0) {
        return Promise.resolve();
    }

    return fetch(
           `${inviteServiceUrl}?token=${jwt}`,
           {
               body: JSON.stringify({
                   'invited': inviteItems,
                   'url': inviteUrl
               }),
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json'
               }
           }
    );
}

/**
 * Determines if adding people is currently enabled.
 *
 * @param {boolean} state - Current state.
 * @returns {boolean} Indication of whether adding people is currently enabled.
 */
export function isAddPeopleEnabled(state: Object): boolean {
    const { peopleSearchUrl } = state['features/base/config'];
    const { isGuest } = state['features/base/jwt'];

    return !isGuest && Boolean(peopleSearchUrl);
}

/**
 * Determines if dial out is currently enabled or not.
 *
 * @param {boolean} state - Current state.
 * @returns {boolean} Indication of whether dial out is currently enabled.
 */
export function isDialOutEnabled(state: Object): boolean {
    const { conference } = state['features/base/conference'];

    return isLocalParticipantModerator(state)
        && conference && conference.isSIPCallingSupported();
}

/**
 * Checks whether a string looks like it could be for a phone number.
 *
 * @param {string} text - The text to check whether or not it could be a phone
 * number.
 * @private
 * @returns {boolean} True if the string looks like it could be a phone number.
 */
function isMaybeAPhoneNumber(text: string): boolean {
    if (!isPhoneNumberRegex().test(text)) {
        return false;
    }

    const digits = getDigitsOnly(text);

    return Boolean(digits.length);
}

/**
 * RegExp to use to determine if some text might be a phone number.
 *
 * @returns {RegExp}
 */
function isPhoneNumberRegex(): RegExp {
    let regexString = '^[0-9+()-\\s]*$';

    if (typeof interfaceConfig !== 'undefined') {
        regexString = interfaceConfig.PHONE_NUMBER_REGEX || regexString;
    }

    return new RegExp(regexString);
}

/**
 * Sends an ajax request to a directory service.
 *
 * @param {string} serviceUrl - The service to query.
 * @param {string} jwt - The jwt token to pass to the search service.
 * @param {string} text - Text to search.
 * @param {Array<string>} queryTypes - Array with the query types that will be
 * executed - "conferenceRooms" | "user" | "room".
 * @returns {Promise} - The promise created by the request.
 */
export function searchDirectory( // eslint-disable-line max-params
        serviceUrl: string,
        jwt: string,
        text: string,
        queryTypes: Array<string> = [ 'conferenceRooms', 'user', 'room' ]
): Promise<Array<Object>> {

    const query = encodeURIComponent(text);
    const queryTypesString = encodeURIComponent(JSON.stringify(queryTypes));

    return fetch(`${serviceUrl}?query=${query}&queryTypes=${
        queryTypesString}&jwt=${jwt}`)
            .then(response => {
                const jsonify = response.json();

                if (response.ok) {
                    return jsonify;
                }

                return jsonify
                    .then(result => Promise.reject(result));
            })
            .catch(error => {
                logger.error(
                    'Error searching directory:', error);

                return Promise.reject(error);
            });
}

/**
 * Returns descriptive text that can be used to invite participants to a meeting
 * (share via mobile or use it for calendar event description).
 *
 * @param {Object} state - The current state.
 * @param {string} inviteUrl - The conference/location URL.
 * @param {boolean} useHtml - Whether to return html text.
 * @returns {Promise<string>} A {@code Promise} resolving with a
 * descriptive text that can be used to invite participants to a meeting.
 */
export function getShareInfoText(
        state: Object, inviteUrl: string, useHtml: ?boolean): Promise<string> {
    let roomUrl = _decodeRoomURI(inviteUrl);
    const includeDialInfo = state['features/base/config'] !== undefined;

    if (useHtml) {
        roomUrl = `<a href="${roomUrl}">${roomUrl}</a>`;
    }

    let infoText = i18next.t('share.mainText', { roomUrl });

    if (includeDialInfo) {
        const { room } = parseURIString(inviteUrl);
        let numbersPromise;

        if (state['features/invite'].numbers
            && state['features/invite'].conferenceID) {
            numbersPromise = Promise.resolve(state['features/invite']);
        } else {
            // we are requesting numbers and conferenceId directly
            // not using updateDialInNumbers, because custom room
            // is specified and we do not want to store the data
            // in the state
            const { dialInConfCodeUrl, dialInNumbersUrl, hosts }
                = state['features/base/config'];
            const mucURL = hosts && hosts.muc;

            if (!dialInConfCodeUrl || !dialInNumbersUrl || !mucURL) {
                // URLs for fetching dial in numbers not defined
                return Promise.resolve(infoText);
            }

            numbersPromise = Promise.all([
                getDialInNumbers(dialInNumbersUrl, room, mucURL),
                getDialInConferenceID(dialInConfCodeUrl, room, mucURL)
            ]).then(([ numbers, {
                conference, id, message } ]) => {

                if (!conference || !id) {
                    return Promise.reject(message);
                }

                return {
                    numbers,
                    conferenceID: id
                };
            });
        }

        return numbersPromise.then(
            ({ conferenceID, numbers }) => {
                const phoneNumber = _getDefaultPhoneNumber(numbers) || '';

                return `${
                    i18next.t('info.dialInNumber')} ${
                    phoneNumber} ${
                    i18next.t('info.dialInConferenceID')} ${
                    conferenceID}#\n\n`;
            })
            .catch(error =>
                logger.error('Error fetching numbers or conferenceID', error))
            .then(defaultDialInNumber => {
                let dialInfoPageUrl = getDialInfoPageURL(
                    room,
                    state['features/base/connection'].locationURL);

                if (useHtml) {
                    dialInfoPageUrl
                        = `<a href="${dialInfoPageUrl}">${dialInfoPageUrl}</a>`;
                }

                infoText += i18next.t('share.dialInfoText', {
                    defaultDialInNumber,
                    dialInfoPageUrl });

                return infoText;
            });
    }

    return Promise.resolve(infoText);
}

/**
 * Generates the URL for the static dial in info page.
 *
 * @param {string} conferenceName - The conference name.
 * @param {Object} locationURL - The current location URL, the object coming
 * from state ['features/base/connection'].locationURL.
 * @returns {string}
 */
export function getDialInfoPageURL(
        conferenceName: string,
        locationURL: Object) {
    const origin = locationURL.origin;
    const pathParts = locationURL.pathname.split('/');

    pathParts.length = pathParts.length - 1;

    const newPath = pathParts.reduce((accumulator, currentValue) => {
        if (currentValue) {
            return `${accumulator}/${currentValue}`;
        }

        return accumulator;
    }, '');

    return `${origin}${newPath}/static/dialInInfo.html?room=${_decodeRoomURI(conferenceName)}`;
}

/**
 * Generates the URL for the static dial in info page.
 *
 * @param {string} uri - The conference URI string.
 * @returns {string}
 */
export function getDialInfoPageURLForURIString(
        uri: ?string) {
    if (!uri) {
        return undefined;
    }
    const { protocol, host, contextRoot, room } = parseURIString(uri);

    return `${protocol}//${host}${contextRoot}static/dialInInfo.html?room=${room}`;
}

/**
 * Sets the internal state of which dial-in number to display.
 *
 * @param {Array<string>|Object} dialInNumbers - The array or object of
 * numbers to choose a number from.
 * @private
 * @returns {string|null}
 */
export function _getDefaultPhoneNumber(
        dialInNumbers: Object): ?string {

    if (Array.isArray(dialInNumbers)) {
        // new syntax follows
        // find the default country inside dialInNumbers, US one
        // or return the first one
        const defaultNumber = dialInNumbers.find(number => number.default);

        if (defaultNumber) {
            return defaultNumber.formattedNumber;
        }

        return dialInNumbers.length > 0
            ? dialInNumbers[0].formattedNumber : null;
    }

    const { numbers } = dialInNumbers;

    if (numbers && Object.keys(numbers).length > 0) {
        // deprecated and will be removed
        const firstRegion = Object.keys(numbers)[0];

        return firstRegion && numbers[firstRegion][0];
    }

    return null;
}

/**
 * Decodes URI only if doesn't contain a space(' ').
 *
 * @param {string} url - The string to decode.
 * @returns {string} - It the string contains space, encoded value is '%20' returns
 * same string, otherwise decoded one.
 * @private
 */
export function _decodeRoomURI(url: string) {
    let roomUrl = url;

    // we want to decode urls when the do not contain space, ' ', which url encoded is %20
    if (roomUrl && !roomUrl.includes('%20')) {
        roomUrl = decodeURI(roomUrl);
    }

    return roomUrl;
}
