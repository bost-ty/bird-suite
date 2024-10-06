"use strict";

const CLIENT_ID = "p1qg8d7u9wf5580xqwuu3ot0yk69nx";
const REDIRECT_URI = "http://localhost:5500";
const STATE_STORE = `oauth_state_${CLIENT_ID}`;
const SCOPES = ["moderator:read:chatters", "channel:read:polls"];
const authorizeButton = document.getElementById("authorizeButton");
const authorizeSection = document.getElementById("authorizeSection");
const callbackSection = document.getElementById("callbackSection");
const controlsSection = document.getElementById("controlsSection");

const hideButton = document.getElementById("ctrl-hide");
hideButton.onclick = () => toggleVisibility(authorizeSection, callbackSection);

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
		&state=${state}
		`;
	sessionStorage.setItem(STATE_STORE, state);
	const url = `https://id.twitch.tv/oauth2/authorize?${parameters}`;
	location.assign(url);
});

if (!document.location.hash) throw new Error("Halting: no document.location.hash");

/* Authorized! */

const sp = new URLSearchParams(document.location.hash);
const sessionState = sessionStorage.getItem(STATE_STORE);
const uriState = sp.get("state");

if (!(uriState && sessionState && uriState === sessionState)) {
	callbackSection.style.color = "var(--code)";
	callbackSection.style.fontFamily = "monospace";
	callbackSection.textContent =
		"Client/server OAuth state mismatch. Please reauthenticate.";
	throw new Error("Client/server OAuth state mismatch");
} else if (sp.has("error")) {
	throw new Error(sp.get("error"));
} else {
	const validAuth = fetch("https://id.twitch.tv/oauth2/validate", {
		headers: { Authorization: `OAuth ${sp.get("#access_token")}` },
	}).then((res) => res);
	if (!validAuth) {
		throw new Error("Invalid OAuth response from Twitch");
	}
	authorizeButton.innerText = "Reauthorize on Twitch";
	renderURLSearchParamsAsUL(callbackSection, sp, [
		"#access_token",
		"scope",
		"state",
		"token_type",
	]);
}

function renderURLSearchParamsAsUL(parentElement, urlSearchParams, keyWhitelist) {
	const ul = document.createElement("ul");
	urlSearchParams.forEach((value, key) => {
		const li = document.createElement("li");
		if (keyWhitelist.includes(key)) {
			li.innerHTML = `<strong>${key}</strong> ${value}`;
			ul.append(li);
		}
	});
	parentElement.insertAdjacentElement("beforeend", ul);
}

function toggleVisibility(...elements) {
	elements.forEach((element) => {
		const dur = 250;
		const isHidden = element.hidden;
		if (!element.style.transitionProperty)
			element.style.transitionProperty = "opacity, transform";
		if (!element.style.transitionDuration)
			element.style.transitionDuration = `${dur}ms`;
		if (!element.style.transitionTimingFunction)
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
