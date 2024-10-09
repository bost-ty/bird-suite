"use strict";

import { makeConfig, generateCsv, downloadCsv } from "./csv.js";
import { renderURLSearchParamsAsUL, toggleVisibility } from "./render.js";
import {
	validateAuth,
	fetchTwitch,
	getChatterCount,
	getViewerCount,
	getUserId,
} from "./twitch.js";

const CLIENT_ID = "p1qg8d7u9wf5580xqwuu3ot0yk69nx";
const REDIRECT_URI = "http://localhost:5500";
const EVENT_STORE = `events_${CLIENT_ID}`;
const STATE_STORE = `oauth_state_${CLIENT_ID}`;
const SCOPES = ["moderator:read:chatters"];
const HELIX = "https://api.twitch.tv/helix";

let events = JSON.parse(localStorage.getItem(EVENT_STORE)) || [];

const authorizeButton = document.getElementById("authorizeButton");
const authorizeSection = document.getElementById("authorizeSection");
const callbackSection = document.getElementById("callbackSection");
const usernameInput = document.getElementById("usernameInput");
const connectButton = document.getElementById("connectButton");
const eventInput = document.getElementById("eventInput");
const markButton = document.getElementById("markButton");
const eventOutput = document.getElementById("eventOutput");

usernameInput.disabled = true;
eventInput.disabled = true;
connectButton.disabled = true;
markButton.disabled = true;

const rerender = () => renderEvents(eventOutput, events);
if (events.length > 0) rerender();

// Set up top-level controls
const viewersInput = document.getElementById("viewers");
const chattersInput = document.getElementById("chatters");

const hideBtn = document.getElementById("ctrl-hide");
hideBtn.addEventListener("click", () => {
	toggleVisibility(authorizeSection, callbackSection);
});

const clearBtn = document.getElementById("ctrl-clear");
clearBtn.addEventListener("click", () => {
	let p = prompt("Are you sure?\nYES to delete ALL events.\nThis cannot be reversed!");
	if (p === "YES") {
		alert("You said YES; ALL events will be deleted!");
		localStorage.removeItem(EVENT_STORE);
		events = [];
		rerender();
	} else {
		alert("You did NOT say 'YES', so did NOT delete all events.");
	}
});

const clearChannelBtn = document.getElementById("ctrl-clear-channel");
clearChannelBtn.addEventListener("click", () => {
	usernameInput.disabled = false;
	connectButton.disabled = false;
	connectButton.innerText = `Connect to target channel`;
	usernameInput.value = "";
	viewersInput.value = "";
	chattersInput.value = "";
	usernameInput.focus();
});

authorizeButton?.addEventListener("click", () => {
	const responseType = "token";
	const forceVerify = true;
	const scopes = SCOPES.map((scope) => encodeURIComponent(scope)).join("+");
	const state = window.btoa(new Date().toISOString());
	const parameters = `response_type=${responseType}
						&client_id=${CLIENT_ID}
						&force_verify=${forceVerify}
						&redirect_uri=${REDIRECT_URI}
						&scope=${scopes}
						&state=${state}`;
	localStorage.setItem(STATE_STORE, state);
	const url = `https://id.twitch.tv/oauth2/authorize?${parameters}`;
	location.assign(url);
});

if (!document.location.hash) throw new Error("Halting: no document.location.hash");

/* We have something in document.location.hash, let's look at it: */

const sp = new URLSearchParams(document.location.hash);
const sessionState = localStorage.getItem(STATE_STORE);
const uriState = sp.get("state");

if (!(uriState && sessionState && uriState === sessionState)) {
	callbackSection.textContent = "OAuth state mismatch. Please reauthenticate!";
	throw new Error("Client/server OAuth state mismatch");
} else if (sp.has("error")) {
	callbackSection.textContent = "Authentication error. Please reauthenticate!";
	throw new Error(sp.get("error"));
}

console.log("Token response valid, starting validation & setting further controls...");
// State is OK,
// No authentication errors,
// So let's maintain our OAuth session
// and check our status w/ Twitch every hour,
// as required.
// And enable the inputs for further actions!
usernameInput.disabled = false;
connectButton.disabled = false;
eventInput.disabled = false;
markButton.disabled = false;

const bearer = `Bearer ${sp.get("#access_token")}`;
const headers = { Authorization: bearer, "Client-Id": CLIENT_ID };

let revalidationTimeout;
let clientUsername = "",
	clientUserId = "";
validateAuth(revalidationTimeout);

const renderedUL = renderURLSearchParamsAsUL(callbackSection, sp, [
	"#access_token",
	"scope",
	"state",
	"token_type",
]);

connectButton.addEventListener("click", async () => {
	// Get username from page
	const username = usernameInput.value;
	// Make request to Twitch
	const userId = await getUserId(username, headers);
	if (!userId) {
		throw new Error("Couldn't get userId!");
	}
	try {
		viewersInput.value = await getViewerCount(userId, headers);
		const viewersInterval = setInterval(async () => {
			console.log("updating viewers...");
			viewersInput.value = await getViewerCount(userId, headers);
		}, 1000 * 30);
		chattersInput.value = await getChatterCount(userId, clientUserId, headers);
		const chattersInterval = setInterval(async () => {
			console.log("updating chatters...");
			chattersInput.value = await getChatterCount(userId, clientUserId, headers);
		}, 1000 * 30);
		connectButton.innerText = `Connected to ${username} (${userId})`;
		connectButton.disabled = true;
		usernameInput.disabled = true;
	} catch (error) {
		connectButton.innerText = error;
		console.warn(error);
	}
});

eventInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter") markButton.click();
});

/**
 *
 * @param {Object[]} events the global events array
 * @param {string} eventName
 * @param {string} channel
 * @param {number} time Date.now() please!
 */
function updateEvents(events, eventName, channel, time = Date.now()) {
	events.push({
		time,
		channel,
		eventName,
	});
	localStorage.setItem(EVENT_STORE, JSON.stringify(events));
}

markButton.addEventListener("click", () => {
	const channel = usernameInput.value || "Channel";
	const eventName = eventInput.value || "Event";
	updateEvents(events, eventName, channel);
	localStorage.setItem(EVENT_STORE, JSON.stringify(events));
	eventInput.value = "";
	eventInput.focus();
	rerender();
});

const downloadButton = document.getElementById("downloadButton");
downloadButton.addEventListener("click", () => {
	let title = document.getElementById("eventsTitle").value;
	if (!title) {
		title = prompt("No title found, enter here or leave it empty:");
	}
	const d = new Date().toISOString().slice(0, 10);
	const csvConfig = makeConfig({
		useKeysAsHeaders: true,
		filename: `${title}_${d}`,
		title: `${title}_${d}`,
		showTitle: true,
		useBom: true,
	});
	if (events) {
		const csv = generateCsv(csvConfig)(events);
		downloadCsv(csvConfig)(csv);
	} else {
		console.error("No events found, didn't download");
	}
});
