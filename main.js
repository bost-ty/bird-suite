"use strict";

import { makeConfig, generateCsv, downloadCsv } from "./csv.js";

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

const rerender = () => renderEvents(eventOutput, events);
if (events.length > 0) rerender();

// Set up top-level controls
console.log("Setting top-level controls...");

const viewersInput = document.getElementById("viewers");
const chattersInput = document.getElementById("chatters");

const hideButton = document.getElementById("ctrl-hide");
hideButton.addEventListener("click", () => {
	toggleVisibility(authorizeSection, callbackSection);
});

const clearButton = document.getElementById("ctrl-clear");
clearButton.addEventListener("click", () => {
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

const clearChannelButton = document.getElementById("ctrl-clear-channel");
clearChannelButton.addEventListener("click", () => {
	usernameInput.disabled = false;
	connectButton.disabled = false;
	connectButton.innerText = `Connect to target channel`;
	usernameInput.value = "";
	viewersInput.value = "";
	chattersInput.value = "";
	usernameInput.focus();
});

console.log("Controls set, setting authorizeButton...");

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

/* We have /something/ in document.location.hash, let's look at it: */

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

let revalidationTimeout = revalidateAuth();

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
		setTimeout(async () => {
			viewersInput.value = await getViewerCount(userId, headers);
		}, 1000 * 30);
		chattersInput.value = await getChatterCount(userId, "bostty", headers);
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

/**
 **
 */

function renderURLSearchParamsAsUL(parentElement, urlSearchParams, keyWhitelist) {
	parentElement.innerHTML = "";
	const ul = document.createElement("ul");
	urlSearchParams.forEach((value, key) => {
		const li = document.createElement("li");
		if (keyWhitelist.includes(key)) {
			li.innerHTML = `<strong>${key}</strong> ${value}`;
			ul.appendChild(li);
		}
	});
	parentElement.appendChild(ul);
	return ul;
}

function toggleVisibility(...elements) {
	const dur = 250;
	elements.forEach((element) => {
		const isHidden = element.hidden;
		element.style.transitionProperty = "opacity, transform";
		element.style.transitionDuration = `${dur}ms`;
		element.style.transitionTimingFunction = "ease";
		let transitionTimeout = setTimeout(() => {}, 0);
		if (isHidden) {
			clearTimeout(transitionTimeout);
			element.style.opacity = 0;
			element.style.transform = "translateY(-1rem)";
			element.hidden = !element.hidden;
			transitionTimeout = setTimeout(() => {
				element.style.opacity = 1;
				element.style.transform = "translateY(0) ";
			}, dur);
		} else if (!isHidden) {
			clearTimeout(transitionTimeout);
			element.style.transform = "translateY(-1rem)";
			element.style.opacity = 0;
			transitionTimeout = setTimeout(() => {
				element.hidden = !element.hidden;
			}, dur + 100);
		} else {
			throw new Error(`toggleVisibility couldn't evaluate isHidden for ${element}`);
		}
	});
}

/* Twitch API callers */

async function revalidateAuth() {
	console.log("Validating authorization...");
	const validAuth = await fetch("https://id.twitch.tv/oauth2/validate", {
		headers: { Authorization: bearer },
	});
	if (validAuth["ok"]) {
		console.log("Validation OK!");
		authorizeButton.innerText = "Reauthorize on Twitch";
		const renderedUL = renderURLSearchParamsAsUL(callbackSection, sp, [
			"#access_token",
			"scope",
			"state",
			"token_type",
		]);
		const { login } = await validAuth.json();
		callbackSection.append(`Authenticated as: ${login}`);
		const oneHourMs = 1000 * 60 * 60;
		revalidationTimeout = setTimeout(revalidateAuth, oneHourMs);
		console.log(`Revalidation set for ${new Date(Date.now() + oneHourMs)}`);
		return revalidationTimeout;
	} else {
		if (revalidationTimeout) clearTimeout(revalidationTimeout);
		throw new Error(
			"Failed to validate authorization on Twitch. Please reauthenticate!"
		);
	}
}

/**
 *
 * @param {string} endpoint endpoint (`users`, `streams`, `chat/chatters`)
 * @param {{ q: string, p: string | number }} parameters which parameters to add & their values
 * @param { string } target the field we want from the result
 * @param { { Authorization: string, Client-Id: string }} headers headers for fetch()
 */
async function fetchTwitch(endpoint, parameters, target, headers) {
	const url = HELIX + "/" + endpoint + "?" + parameters.q + "=" + parameters.p;
	const r = await fetch(url, { headers });
	if (!r.ok) {
		throw new Error(`Fetch error for ${endpoint} (${parameters}, ${headers})`);
	}
	const data = await r.json();
	if (!data || !data[0]) {
		throw new Error(`Data error for ${endpoint} (${parameters}, ${headers})`);
	}
	return data[0][target];
}

// const userId = await fetchTwitch("users", { q: "login", p: liveUserName }, "id", headers);

async function getUserId(liveUserName, headers) {
	const r = await fetch(`${HELIX}/users?login=${liveUserName}`, { headers });
	if (!r.ok) {
		throw new Error(
			`Error: couldn't getUserId for ${liveUserName} (${r.status}) ${r.message}`
		);
	}
	const { data } = await r.json();
	if (!data || !data[0]) {
		throw new Error(`Error: couldn't access data[0].id for ${liveUserName}`);
	}
	return data[0]["id"];
}

async function getViewerCount(liveUserId, headers) {
	const r = await fetch(`${HELIX}/streams?user_id=${liveUserId}`, {
		headers,
	});
	const { data } = await r.json();
	console.log(data);
	if (!data || !data[0]) {
		throw new Error(`No viewer count data for ${liveUserId}`);
	}
	return data[0]["viewer_count"];
}

async function getChatterCount(liveUserId, modUserId, authHeaders) {}

/**
 * renderEvents
 * @param {HTMLElement} parent
 * @param {{ time: Number , data: String}} events
 */
function renderEvents(parent, events) {
	console.log("RENDER EVENTS", events.length);
	if (events.length === 0) {
		parent.innerHTML = "";
		return;
	}
	while (parent.children.length > events.length) {
		parent.lastChild.remove();
	}
	events.forEach((eventObject, index) => {
		const { time, data } = eventObject;
		let element;
		if (index < parent.children.length) {
			element = parent.children[index];
		} else {
			element = document.createElement("div");
			parent.appendChild(element);
		}
		element.innerHTML = `${new Date(time).toLocaleTimeString()}: ${data}`;
	});
}
