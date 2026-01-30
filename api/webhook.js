import axios from "axios";

// Your Facebook Page Access Token
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Function to pass control to human agent
async function passControlToHuman(psid) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/pass_thread_control`,
      {
        recipient: { id: psid },
        target_app_id: 263902037430900, // Facebook Inbox
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

export default async (req, res) => {
  try {
    // Simple GET for testing
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

      // --- Handle Default Welcome Intent ---
      if (intentName === "Default Welcome Intent") {
        return res.status(200).json({
          fulfillmentText: `Hi ${firstName}! 👋 Welcome to our page! How can I help you today?`,
        });
      }

      // --- Handle TalkToHuman Intent ---
      if (intentName === "TalkToHuman") {
        // Notify the user
        res.status(200).json({
          fulfillmentText: `Hi ${firstName}! 👋 You are now being connected to a human agent. They will reply shortly.`,
        });

        // Pass control to human agent
        await passControlToHuman(psid);
        return;
      }

      // Fallback for other intents
      return res.status(200).json({ fulfillmentText: "Hello! 👋" });
    }

    // Fallback for non-Messenger requests
    return res.status(200).json({ fulfillmentText: "Hello! 👋" });

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ fulfillmentText: "Hi there! 👋" });
  }
};
