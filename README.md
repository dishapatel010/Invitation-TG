# Invite Telegram Bot
Invite Manager for Telegram Chats using Cloudflare Workers

## Usage

* Save and Deploy `invite.js` to cf-worker
* Set two environment variables: `TOKEN` and `TGCHATID`
> The `TOKEN` variable should be set to your Telegram bot token, and the `TGCHATID` variable should be set to the ID of the chat where you want to create invite links.
* The bot must have the `can_invite_users` administrator right in the chat to receive these updates.
* Create KV `INVITE` & Bind to cf-worker as variable `INVITE`
* set webhook to cf-worker `https://api.telegram.org/botTOKEN/setWebhook?url=https://example.subdoamin.workers.dev/` make sure you are doing it to /
* DONE.

## Functionality

The script provides the following functionality:

- Allows users to generate chat invite links by sending the `/invite` command in a private chat with the bot.
- Stores the generated invite link in a Cloudflare KV store with an expiration time of 10 minutes.
- Sends the generated invite link back to the user as a response to their `/invite` command.
- Handles chat join requests by approving or declining them based on whether the request includes a valid invite link.
- Sends error messages to users if there are any issues generating or managing invite links.
