// https://api.slack.com/docs/apps/ai

const { WebClient } = require('@slack/web-api');
const { SocketModeClient } = require('@slack/socket-mode');
require('dotenv').config();

// Read a token from the environment variables
const appToken = process.env.SLACK_SANDBOX_APP_TOKEN;

// Initialize
const socketModeClient = new SocketModeClient({appToken});
const webClient = new WebClient(process.env.SLACK_SANDBOX_BOT_TOKEN);

// Attach listeners to events by type. See: https://api.slack.com/events/message
socketModeClient.on('message', (event) => {
    console.log(event);
  });

// Attach listeners to events by type. See: https://api.slack.com/events/message
socketModeClient.on('reaction_added', async ({event, body, ack}) => {

    try {
      // send acknowledgement back to slack over the socketMode websocket connection
      // this is so slack knows you have received the event and are processing it
      await ack();
      console.log(event);

      // retrieve original asker message for setting thread title
      const messages = await webClient.conversations.history({
        channel: event.item.channel,
        oldest: event.item.ts,
        inclusive: true,
        limit: 1,
      });
      console.log(messages);

      // generate thread title
      const title = createAIAssistantThreadTitle(messages);
      console.log(title);

      // create a new AI Assistant thread by sending a new DM
      const text = `Welcome to the channel, <@${event.user}>. We're here to help. Let us know if you have an issue.
      Message Link : ${createSlackLinkToMessage(event.item.channel, event.item.ts)}`;
      const thread = await webClient.chat.postMessage({
          text,
          blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text,
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Get Help',
              },
              value: 'get_help',
            },
          },
        ],
        channel: event.user,
        metadata : JSON.stringify({
          original_msg_ts :  event.item.ts,
          original_msg_channel : event.item.channel,
        }),
      });
      console.log(thread);

      // set thread title
      await webClient.assistant.threads.setTitle({
        title,
        channel_id: thread.channel,
        thread_ts : thread.ts,
     });

    } catch (error) {
      console.log('An error occurred', error);
    }
  });

  const createSlackLinkToMessage = (channel, ts) =>{
    const workspace = `https://xxx.slack.com/archives` // to be replaced with your own workspace URL
    const formattedts = ts.replace('.','');
    return `${workspace}/${channel}/${formattedts}`
  }

  const createAIAssistantThreadTitle = (messages) =>{
    const ask = messages.messages[0]
    const user = `<@${ask.user}>`
    const text = `${ask.text.substring(0, 50)}...`
    return `${user} ${text}`
  }

(async () => {
  // Connect to Slack
  await socketModeClient.start();
})();