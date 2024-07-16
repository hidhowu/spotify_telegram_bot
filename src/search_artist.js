// require('dotenv').config();
// const axios = require('axios');
// const TelegramBot = require('node-telegram-bot-api');
// const botToken = process.env.BOT_API;

// const bot = new TelegramBot(botToken, { polling: true });


export async function find_artist_by_name(artist, type, offset = 0, limit = 20, chatId, expiryTime, accessToken, axios, bot) {
    // let limit = limit;
    try {

        // checking limit
        if (limit == null || !isFinite(limit) || limit == 0 || limit > 10) {
            limit = 10;
        }

        const queryData = `${encodeURIComponent(`artist:${artist}`)}&type=${type}&offset=${offset}&limit=${limit}`;
        const query = `https://api.spotify.com/v1/search?q=${queryData}`;

        const headers = `Authorization: Bearer ${accessToken}`;
        // console.log(accessToken);

        const response = await axios.get(query, { headers });

        const artists = response.data.artists.items;
        // let htmlString = '';
        artists.forEach(el => {

            const string = `
Artist Name: ${el.name}
Followers: ${el.followers.total}
Genre: ${el.genres.splice(3).join(', ')}
Artist Id: ${el.id}
<a href="${el.external_urls.spotify}">View Artist Profile</a>\n\n
        `;

            // htmlString = htmlString + string;

            bot.sendMessage(chatId, string, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: 'Artist Profile', callback_data: `get_artist:${el.id}` }, { text: 'Visit Artist Spotify', url: `${el.external_urls.spotify}` }
                    ]]
                }
            });
        });

        // return htmlString;

        return;
    } catch (error) {
        console.log(error);
    }

}
// module.exports = find_artist_by_name;