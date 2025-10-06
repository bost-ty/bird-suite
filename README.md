# Bird Suite

The Twitch API is pretty fragmented.
Libraries aren't really doing what they used to do.

Bird Suite is a frontend-only, vanilla JavaScript utility for gathering basic Twitch analytics.

## Endpoints one might need

1. Get Users (app access token OR user access token) -> get a user ID from a login name/display name.
2. Get Chatters (user access token; `moderator:read:chatters` scope) -> paginated, but returns a `total` parameter at the root of the response that should be complete (Testable).
3. Search Channels (app or user) -> Return channels that match a query and have streamed in the last 6 months. Can be set for live_only or not; if live_only is false, matches on the broadcaster's login name. The beginning of the name must match the query string, case-insensitive. Returns `broadcaster_login` name, `display_name`, and `id`, which we can use in Get Chatters if we want. (Replaces Get Users, but not needed.)
4. Get Streams: app or user token. Gets a list of all streams,
   but filter by a query token (user_id, user_login).
   Only returns ACTIVE broadcasts. Returns viewer_count, among other things.
