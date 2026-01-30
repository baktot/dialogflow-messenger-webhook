import axios from "axios";

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Pass control to human agent
async function passControlToHuman(psid) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/pass_thread_control`,
      {
        recipient: { id: psid },
        target_app_id: 263902037430900, // Page Inbox app ID
        metadata: "Passing control to human agent",
      },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log("✅ Control passed to human agent for PSID:", psid);
  } catch (err) {
    console.error("❌ Handoff error:", err.response?.data || err.message);
  }
}

// Take control back from human agent to bot
async function takeControlBack(psid) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/take_thread_control`,
      {
        recipient: { id: psid },
        metadata: "Returning control to bot",
      },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    console.log("✅ Control returned to bot for PSID:", psid);
  } catch (err) {
    console.error("❌ Take control error:", err.response?.data || err.message);
  }
}

// Send message directly to Messenger
async function sendMessage(psid, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/messages`,
      {
        recipient: { id: psid },
        message: { text },
      },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch (err) {
    console.error("❌ Messenger send error:", err.response?.data || err.message);
  }
}

export default async (req, res) => {
  try {
    console.log("Incoming webhook body:", JSON.stringify(req.body, null, 2));

    if (req.method === "GET") return res.status(200).send("Webhook alive");
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const body = req.body;
    const intentName = body.queryResult?.intent?.displayName || "UnknownIntent";
    const originalRequest = body.originalDetectIntentRequest;
    const psid = originalRequest?.payload?.data?.sender?.id;

    if (!psid) {
      console.warn("PSID missing. Cannot send reply.");
      return res.status(200).json({ fulfillmentText: "Hi! 👋" });
    }

    // Fetch first name safely
    let firstName = "";
    try {
      const fbResponse = await axios.get(`https://graph.facebook.com/${psid}`, {
        params: { fields: "first_name", access_token: PAGE_ACCESS_TOKEN },
      });
      firstName = fbResponse.data.first_name || "";
    } catch (err) {
      console.warn("Error fetching first name:", err.message);
      firstName = "";
    }

    // --- Default Welcome Intent ---
    if (intentName === "Default Welcome Intent") {
      await sendMessage(psid, `Hi ${firstName}! 👋 Welcome to our page! How can I help you today?`);
      return res.status(200).json({ fulfillmentText: "" });
    }

    // --- TalkToHuman Intent ---
    if (intentName === "TalkToHuman") {
      await sendMessage(
        psid,
        `Hi ${firstName}! 👋 You are now being connected to a human agent. They will reply shortly.`
      );
      await passControlToHuman(psid);
      return res.status(200).json({ fulfillmentText: "" });
    }

    // --- ReturnToBot Intent ---
   if (intentName === "ReturnToBot") {
  if (!humanControl[psid]) {
    console.log("Bot already has control for PSID:", psid);
  } else {
    await takeControlBack(psid); // Only call if human had control
  }
  humanControl[psid] = false; // resume bot
  return res.status(200).json({
    fulfillmentText: `✅ You're back with the bot now, ${firstName}! How can I assist you?`,
  });
}

    // --- Fallback ---
    await sendMessage(psid, "Hello! 👋");
    return res.status(200).json({ fulfillmentText: "" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ fulfillmentText: "Hi there! 👋" });
  }
};

