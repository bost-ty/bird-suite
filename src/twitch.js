/**
 * @returns { { clientUsername: string, clientUserId: string, revalidationTimeout: number } } Validation data object
 */
async function validateAuth(revalidationTimeout) {
	const validAuth = await fetch("https://id.twitch.tv/oauth2/validate", {
		headers: { Authorization: bearer },
	});
	if (validAuth["ok"]) {
		console.log("Validation OK!");
		authorizeButton.innerText = "Reauthorize on Twitch";
		const { login, user_id } = await validAuth.json();
		callbackSection.append(`Authenticated as: ${login} (${user_id})`);
		const oneHourMs = 1000 * 60 * 60;
		revalidationTimeout = setTimeout(validateAuth, oneHourMs);
		console.log(`Revalidation set for ${new Date(Date.now() + oneHourMs)}`);
		let v = { login, user_id, revalidationTimeout };
		return v;
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
 * @returns { {} } result
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

// const userId = await fetchTwitch("users", { q: "login", p: liveUsername }, "id", headers);

/**
 *
 * @param { string } liveUsername Target channel username
 * @param { object } headers
 * @returns { string } userId
 */
async function getUserId(liveUsername, headers) {
	const r = await fetch(`${HELIX}/users?login=${liveUsername}`, { headers });
	if (!r.ok) {
		throw new Error(
			`Error: couldn't getUserId for ${liveUsername} (${r.status}) ${r.message}`
		);
	}
	const { data } = await r.json();
	if (!data || !data[0]) {
		throw new Error(`Error: couldn't access data[0].id for ${liveUsername}`);
	}
	return data[0]["id"];
}

/**
 *
 * @param {string} liveUserId
 * @param { object } headers
 * @returns { number } viewerCount
 */
async function getViewerCount(liveUserId, headers) {
	const r = await fetch(`${HELIX}/streams?user_id=${liveUserId}`, {
		headers,
	});
	const { data } = await r.json();
	if (!data || !data[0]) {
		throw new Error(`No viewer count data for ${liveUserId}`);
	}
	return data[0]["viewer_count"];
}

/**
 *
 * @param {string} liveUserId
 * @param {string} modUserId
 * @param {object} headers
 * @returns { number } chatterCount
 */
async function getChatterCount(liveUserId, modUserId, headers) {
	const r = await fetch(
		`${HELIX}/chat/chatters?broadcaster_id=${liveUserId}&moderator_id=${modUserId}`,
		{
			headers,
		}
	);
	const json = await r.json();
	if (!json || !json["total"]) {
		throw new Error(`No chatter count data for ${liveUserId}`);
	}
	return json["total"];
}

export { getChatterCount, getViewerCount, getUserId, fetchTwitch, validateAuth };
