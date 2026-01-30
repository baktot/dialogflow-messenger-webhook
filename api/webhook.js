import { get } from "axios";

export default async (req, res) => {
  try {
    // Only accept POST
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const originalRequest = req.body.originalDetectIntentRequest;

    // Check if request is from Messenger
    if (originalRequest && originalRequest.source === "facebook") {
      const psid = originalRequest.payload.data.sender.id;

      // Fetch first name from Facebook Graph API
      const fbResponse = await get(
        `https://graph.facebook.com/${psid}`,
        {
          params: {
            fields: "first_name",
            access_token: process.env.PAGE_ACCESS_TOKEN,
          },
        }
      );

      const firstName = fbResponse.data.first_name;

      return res.status(200).json({
        fulfillmentText: `Hi ${firstName}! 👋 Welcome to our page! How can I help you today?`,
      });
    }

    // Fallback if not Messenger
    return res.status(200).json({ fulfillmentText: "Hello! 👋" });

  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(500).json({ fulfillmentText: "Hi there! 👋" });
  }
};
