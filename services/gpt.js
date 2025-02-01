require('dotenv').config();
const axios = require('axios');
const API_URL = "https://api.openai.com/v1/chat/completions";



exports.getChatGPTResponse = async function(message) {
    const response = await axios.post(API_URL, {
            model: "gpt-4",                         // Или "gpt-3.5-turbo"
            messages: [{ role: "user", content: message }],
            temperature: 0.7,
        },
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${CONFIG.OPENAI_KEY}`,
            },
        }
    );

    return response.data.choices[0].message.content;
}
