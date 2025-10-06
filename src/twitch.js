const HELIX = "https://api.twitch.tv/helix";
const ID = "https://id.twitch.tv/oauth2";

/**
 * validateAuth
 * @param {number} revalidationTimeout
 * @param {string} bearer
 * @returns { { clientUsername: string, clientUserId: string, revalidationTimeout: number } } Validation data object
 */
async function validateAuth(revalidationTimeout, bearer) {
  const validAuth = await fetch(`${ID}/validate`, {
    headers: { Authorization: bearer },
  });
  if (!validAuth["ok"]) {
    if (revalidationTimeout) clearTimeout(revalidationTimeout);
    throw new Error("Validation failed; please reauthorize on Twitch!");
  }
  console.log("Validation OK!");
  authorizeButton.innerText = "Reauthorize on Twitch";
  const { login, user_id } = await validAuth.json();
  if (!login || !user_id) {
    throw new Error("Couldn't get json from validAuth");
  }
  let v = { clientName: login, clientId: user_id, revalidationTimeout };
  return v;
}

/**
 * fetchTwitch (not used)
 * @param {string} endpoint Twitch Helix API endpoint path (`users`, `streams`, `chat/chatters`)
 * @param {[{ q: string, v: string | number }]} parameters Query parameters to add and their values
 * @param { string } target Field from Twitch's response to return
 * @param {{ Authorization: string, 'Client-Id': string }} headers Auth headers for fetch()
 * @returns { Promise<string | number> } result Result
 */
async function fetchTwitch(endpoint, parameters, target, headers) {
  const p = parameters
    .map((x) => Object.values(x))
    .map((y) => y.join("="))
    .join("&");
  const url = `${HELIX}/${endpoint}?${p}`;
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

// const userId = await fetchTwitch("users", [{ q: "login", p: liveUsername }], "id", headers);

/**
 * getUserId
 * @param { string } bcName Target channel username
 * @param { object } headers
 * @returns { Promise<string> } userId
 */
async function getUserId(bcName, headers) {
  if (!bcName) throw new Error("No bcName provided");
  const r = await fetch(`${HELIX}/users?login=${bcName}`, { headers });
  if (!r.ok) throw new Error(`Failed getUserId for ${bcName} (${r.status})`);
  const { data } = await r.json();
  if (!data[0]) throw new Error(`Failed data[0]["id"] for ${bcName}`);
  return data[0]["id"];
}

/**
 * getViewerCount
 * @param { string } bcId - broadcaster id on Twitch
 * @param { object } headers
 * @returns { Promise<number> } viewerCount
 */
async function getViewerCount(bcId, headers) {
  if (!bcId || bcId === "") throw new Error("No bcId provided");
  const url = `${HELIX}/streams?user_id=${bcId}`;
  const r = await fetch(url, { headers });
  const { data } = await r.json();
  if (!data[0]["viewer_count"])
    throw new Error(`No viewer count data for ${bcId}`);
  return data[0]["viewer_count"];
}

/**
 * getChatterCount
 * @param {string} bcId
 * @param {string} modId
 * @param {object} headers
 * @returns { Promise<number> } chatterCount
 */
async function getChatterCount(bcId, modId, headers) {
  if (!bcId || bcId === "") throw new Error("bcId not provided");
  const url = `${HELIX}/chat/chatters?broadcaster_id=${bcId}&moderator_id=${modId}`;
  const r = await fetch(url, { headers });
  const json = await r.json();
  if (!json["total"]) throw new Error(`No chatter count data for ${bcId}`);
  return json["total"];
}

export {
  getChatterCount,
  getViewerCount,
  getUserId,
  fetchTwitch,
  validateAuth,
};
