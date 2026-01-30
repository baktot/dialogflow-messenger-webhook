app.post("/api/webhook", async (req, res) => {
  try {
    const originalRequest = req.body.originalDetectIntentRequest;

    if (originalRequest && originalRequest.source === "facebook") {
      const psid = originalRequest.payload.data.sender.id;

      // Call FB Graph API for first name
      const fbResponse = await axios.get(
        `https://graph.facebook.com/${psid}`,
        {
          params: {
            fields: "first_name",
            access_token: process.env.PAGE_ACCESS_TOKEN,
          },
        }
      );

      const firstName = fbResponse.data.first_name;

      return res.json({
        fulfillmentText: `Hi ${firstName}! 👋 Welcome to our page! How can I help you today?`,
      });
    }

    return res.json({ fulfillmentText: "Hello! 👋 Welcome!" });
  } catch (error) {
    console.error(error);
    return res.json({ fulfillmentText: "Hi there! 👋 Welcome!" });
  }
});