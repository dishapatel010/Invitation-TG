async function handleRequest(request) {
  const tgToken = TOKEN; // ENV VAR
  const tgChatId = TGCHATID; // ENV VAR
  // Parse the incoming message
  const originalRequest = request.clone();
  const body = await originalRequest.json();

  // Add a condition to check if the message is from the bot itself
  if (!body) {
    return new Response(`ok`, {
      headers: {
        'Content-Type': 'text/html'
      },
      status: 200
    });
  }

  // Check if the request is a chat join request
  if (body && body.chat_join_request) {
    const rchat = body.chat_join_request.chat.id;
    const rfrom = body.chat_join_request.from.id;
    const rinvite_link = body.chat_join_request.invite_link.invite_link;
    // Retrieve the invite link stored in the KV store for the user's chat ID
    const rinviteLink = await INVITE.get(rfrom.toString());

    // If the invite link in the chat join request does not match the stored invite link, send an error response
    if (body.chat_join_request.invite_link.invite_link === rinviteLink) {
      // If the invite link matches the stored invite link, approve the chat join request using the Telegram Bot API
      const apiEndpoint = `https://api.telegram.org/bot${tgToken}/approveChatJoinRequest`;
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: rchat,
          user_id: rfrom
        })
      });

      return new Response(
        JSON.stringify({
          method: "sendMessage",
          chat_id: rfrom,
          text: "Your invitation was accepted 😁",
          parse_mode: "MARKDOWN",
          disable_web_page_preview: "True"
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=UTF-8'
          }
        }
      );
    } else {
      // If the invite link doesn't match the stored invite link, decline the chat join request using the Telegram Bot API
      const apiEndpoint = `https://api.telegram.org/bot${tgToken}/declineChatJoinRequest`;
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: rchat,
          user_id: rfrom
        })
      });

      // Send an error message to the user
      return new Response(
        JSON.stringify({
          method: "sendMessage",
          chat_id: rfrom,
          text: "Generate your own invite.",
          parse_mode: "MARKDOWN",
          disable_web_page_preview: "True"
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=UTF-8'
          }
        }
      );
    }
  }

  // Only process messages sent in a private chat
  if (body.message.chat.type !== 'private') {
    return new Response(`ok`, {
      headers: {
        'Content-Type': 'text/html'
      },
      status: 200
    });
  }

  const {
    message_id,
    text
  } = body.message;
  const chatId = body.message.chat.id;

  // If the message is not an /invite command or chat join request, send a message back to the user and return 200 OK
  if (!text || text.toLowerCase() !== '/invite') {
    return new Response(
      JSON.stringify({
        method: "sendMessage",
        chat_id: chatId,
        text: `Please use the /invite command to create a new chat invite link.`,
        parse_mode: "MARKDOWN",
        disable_web_page_preview: "True",
        reply_to_message_id: message_id
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );
  }

  // Check if there is a valid invite link stored in the KV store for the chat
  const existingLink = await INVITE.get(chatId.toString());
  if (existingLink) {
    return new Response(
      JSON.stringify({
        method: "sendMessage",
        chat_id: chatId,
        text: `Here is your existing invite link: ${existingLink}`,
        parse_mode: "MARKDOWN",
        disable_web_page_preview: "True",
        reply_to_message_id: message_id
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );
  }

  // Otherwise, create a new invite link for the specified chat ID using the Telegram Bot API
  const apiEndpoint = `https://api.telegram.org/bot${tgToken}/createChatInviteLink`;
  const expireDate = Math.floor(Date.now() / 1000) + 600; // Set expiration time to 2 minutes from now
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: tgChatId,
      expire_date: expireDate,
      // member_limit: 1,
      creates_join_request: "True"
    })
  });

  const responseBody = await response.clone().json();
  if (!responseBody || !responseBody.result || !responseBody.result.invite_link) {
    return new Response(
      JSON.stringify({
        method: "sendMessage",
        chat_id: chatId,
        text: `Sorry, something went wrong while creating the invite link. Please try again later.`,
        parse_mode: "MARKDOWN",
        disable_web_page_preview: "True",
        reply_to_message_id: message_id
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );
  }

  const inviteLink = responseBody.result.invite_link;
  // Store the invite link in a Cloudflare KV store with an expiration time
  await INVITE.put(chatId.toString(), inviteLink, {
    expirationTtl: expireDate - Math.floor(Date.now() / 1000)
  });

  // Send the invite link as a response back to the user
  return new Response(
    JSON.stringify({
      method: "sendMessage",
      chat_id: chatId,
      text: `Invite link: ${inviteLink}\nvalid for 10 Minutes\nyou can't share this invite as its special for you`,
      parse_mode: "MARKDOWN",
      disable_web_page_preview: "True"
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      }
    }
  );
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
