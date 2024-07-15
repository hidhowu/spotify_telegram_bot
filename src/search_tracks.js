// require('dotenv').config();
// const axios = require('axios');
// const TelegramBot = require('node-telegram-bot-api');
// const botToken = process.env.BOT_API;

// const bot = new TelegramBot(botToken, { polling: true });


export async function search_track(track, type, offset = 0, limit = 20, chatId, expiryTime, accessToken, axios, bot) {
    // let limit = limit;
    try {

        // checking limit
        if (limit == null || !isFinite(limit) || limit == 0 || limit > 10) {
            limit = 10;
        }

        const queryData = `${encodeURIComponent(`track:${track}`)}&type=${type}&offset=${offset}&limit=${limit}`;
        const query = `https://api.spotify.com/v1/search?q=${queryData}`;

        const headers = `Authorization: Bearer ${accessToken}`;
        // console.log(accessToken);

        const response = await axios.get(query, { headers });

        const tracks = response.data.tracks.items;

        return tracks;
    } catch (error) {
        console.log(error);
    }

}
// module.exports = find_artist_by_name;