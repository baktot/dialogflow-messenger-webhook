import axios from "axios";

// Your Facebook Page Access Token
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Function to pass control to human agent (Page Inbox)
async function passControlToHuman(psid) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/pass_thread_control`,
      {
        recipient: { id: psid },
        target_app_id: 263902037430900, // Page Inbox app ID
        metadata: "Passing control to human agent",
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN },
      }
    );
    console.log("✅ Control passed to human agent for PSID:", psid);
  } catch (err) {
    console.error("❌ Handoff error:", err.response?.data || err.message);
  }
}

// Function to take control back from human agent to bot
async function takeControlBack(psid) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/take_thread_control`,
      {
        recipient: { id: psid },
        metadata: "Returning control to bot",
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN },
      }
    );
    console.log("✅ Control returned to bot for PSID:", psid);
  } catch (err) {
    console.error("❌ Take control error:", err.response?.data || err.message);
  }
}

export default async (req, res) => {
  try {
    if (req.method === "GET") return res.status(200).send("Webhook is alive!");
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const body = req.body;
    const originalRequest = body.originalDetectIntentRequest;
    const intentName = body.queryResult.intent.displayName;

    if (originalRequest && originalRequest.source === "facebook") {
      const psid = originalRequest.payload.data.sender.id;

      // Fetch first name from Messenger Graph API
      const fbResponse = await axios.get(
        `https://graph.facebook.com/${psid}`,
        {
          params: {
            fields: "first_name",
            access_token: PAGE_ACCESS_TOKEN,
          },
        }
      );
      const firstName = fbResponse.data.first_name;

      // --- Default Welcome Intent ---
      if (intentName === "Default Welcome Intent") {
        return res.status(200).json({
          fulfillmentText: `Hi ${firstName}! 👋 Welcome to our page! How can I help you today?`,
        });
      }

      // --- TalkToHuman Intent ---
      if (intentName === "TalkToHuman") {
        // Notify user
        await axios.post(
          `https://graph.facebook.com/v17.0/me/messages`,
          {
            recipient: { id: psid },
            message: {
              text: `Hi ${firstName}! 👋 You are now being connected to a human agent. They will reply shortly.`,
            },
          },
          { params: { access_token: PAGE_ACCESS_TOKEN } }
        );

        // Pass control to human agent
        await passControlToHuman(psid);

        return res.status(200).json({ fulfillmentText: "" }); // Already sent message
      }

      // --- ReturnToBot Intent ---
      if (intentName === "ReturnToBot") {
        // Take control back from human
        await takeControlBack(psid);

        return res.status(200).json({
          fulfillmentText: `✅ You're back with the bot now, ${firstName}! How can I assist you?`,
        });
      }

      // Fallback
      return res.status(200).json({ fulfillmentText: "Hello! 👋" });
    }

    return res.status(200).json({ fulfillmentText: "Hello! 👋" });

  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ fulfillmentText: "Hi there! 👋" });
  }
};
