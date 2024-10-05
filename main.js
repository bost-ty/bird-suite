"use strict";

/* --------- Constants -------- */

const CLIENT_ID = "p1qg8d7u9wf5580xqwuu3ot0yk69nx";
const REDIRECT_URI = "http://localhost:5500";
const STATE_STORE = `oauth_state_${CLIENT_ID}`;
const SCOPES = ["moderator:read:chatters"];

/* --------- HTML Elements -------- */

const authorizeButton = document.getElementById("authorizeButton");
const authorizeSection = document.getElementById("authorizeSection");

const callbackSection = document.getElementById("callbackSection");

/* --------- Good ol' imperative code -------- */

const sp = new URLSearchParams(document.location.hash);
const sessionState = sessionStorage.getItem(STATE_STORE);
const uriState = sp.get("state");

if (hasValidStates(sessionState, uriState)) {
	callbackSection.innerHTML = "It works, make something good happen in here.";
} else {
	callbackSection.innerHTML =
		"There's a problem with your authorization. Try again, or bail.";
}

/* --------- Event Listeners -------- */

authorizeButton?.addEventListener("click", () => {
	const [parameters, state] = generateAuthParameters(
		"token",
		CLIENT_ID,
		REDIRECT_URI,
		SCOPES,
		window.btoa(new Date().toISOString())
	);
	sessionStorage.setItem(STATE_STORE, state);
	const url = `https://id.twitch.tv/oauth2/authorize?${parameters}`;
	location.assign(url);
});

/* --------- Functions -------- */

/**
 * Generate usable `parameters` and `state` for making Twitch auth requests.
 * @param {string} responseType 'token'
 * @param {string} clientId CLIENT_ID
 * @param {string} redirectUri REDIRECT_URI
 * @param {string[]} scopes array of strings for requested scopes
 * @param {string} state `Window.btoa(new Date().toISOString())`
 * @returns {string[]}
 */
function generateAuthParameters(responseType, clientId, redirectUri, scopes, state) {
	return [
		`response_type=${responseType}
		&client_id=${clientId}
		&redirect_uri=${redirectUri}
		&scope=${encodeURIComponent(scopes.join(" "))}
		&state=${state}
		`,
		state,
	];
}
/**
 *
 * @param {string} sessionState
 * @param {string} uriState
 * @returns {boolean}
 */
function hasValidStates(sessionState, uriState) {
	return uriState && sessionState && uriState === sessionState;
}
