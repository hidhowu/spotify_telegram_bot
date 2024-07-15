import 'dotenv/config'; // Replaces require('dotenv').config();
import express from 'express';
// import  charsets  from 'mime';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import querystring from 'querystring';
import { find_artist_by_name } from '../src/search_artist.js';
import { get_artist } from '../src/get_artist.js';
import { get_top_tracks } from '../src/get_tracks.js';
import { search_track } from '../src/search_tracks.js';
// const { access } = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const botToken = process.env.BOT_API;
// Replace with your actual client ID and client secret
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

// Spotify token endpoint
const tokenEndpoint = 'https://accounts.spotify.com/api/token';

const bot = new TelegramBot(botToken, { polling: true });



bot.on('polling_error', (error) => {
    console.error('Polling error:', error.code);
    console.error('Polling error details:', error);
});


// Creating an empty object user state to track user state instead of using a database
const userState = {};

// const data = []

// creating a message state array to track messages and assign them accordingly
const msgState = {

    search_artist: {
        question: {
            1: 'Enter Artist Name:',
            2: 'Enter Result Limit (Minimum: 1, Maximum: 10)'
        },
        length: 0,
    },
    search_track: {
        question: {
            1: 'Enter Song Title:',
            2: 'Enter Result Limit (Minimum: 1, Maximum: 10)'
        },
        length: 0,
    }

}


// Assigning length to all message state
for (const key in msgState) {

    // rechecking if the property exist
    if (msgState.hasOwnProperty(key)) {
        const state = msgState[key];
        state.length = Object.keys(state.question).length;
    }
}




// defining empty variable for access token and its expiry time
let accessToken;
let expiryTime;

// for data for getting access token using axios
const queryData = querystring.stringify({
    grant_type: 'client_credentials',
    client_id: client_id,
    client_secret: client_secret
})

const headers = 'Content-Type: application/x-www-form-urlencoded';
const getAccessToken = async () => {
    try {
        const response = await axios.post(tokenEndpoint, queryData, { headers });
        return response.data;
    } catch (error) {
        console.log('Error Occured:' + error.response ? error.response.data : error.message);
    }
}


// Getting access token from spotify
async function getToken() {
    const accessTokenData = await getAccessToken();
    if (!accessTokenData) return;
    let currentTime = Date.now() / 1000;
    accessToken = accessTokenData.access_token;
    expiryTime = currentTime.toFixed(0) + (accessTokenData.expires_in - 200);
    console.log('Access Token is Activated');
    // return accessTokenData.access_token;
    // console.log(`New Access Token: ${accessToken}`, `Expiry Time: ${expiryTime}`, `Current Time: ${currentTime.toFixed(0)}`);
}






// const find_artist_by_name = async (artist, type, offset = 0, limit = 20, chatId) => {
//     // let limit = limit;
//     let currentTime = Date.now() / 1000;
//     if (!expiryTime || ((currentTime - expiryTime) > 0)) {
//         await getToken();
//     } else {

//     }

//     // checking limit
//     if (limit == null || !isFinite(limit) || limit == 0 || limit > 10) {
//         limit = 10;
//     }

//     const queryData = `${encodeURIComponent(`artist:${artist}`)}&type=${type}&offset=${offset}&limit=${limit}`;
//     const query = `https://api.spotify.com/v1/search?q=${queryData}`;

//     const headers = `Authorization: Bearer ${accessToken}`;
//     // console.log(accessToken);

//     const response = await axios.get(query, { headers });

//     const artists = response.data.artists.items;
//     let htmlString = '';
//     artists.forEach(el => {

//         const string = `
// Artist Name: ${el.name}
// Followers: ${el.followers.total}
// Genre: ${el.genres.splice(3).join(', ')}
// Artist Id: ${el.id}
// <a href="${el.external_urls.spotify}">View Artist Profile</a>\n\n
//         `;

//         // htmlString = htmlString + string;

//         bot.sendMessage(chatId, string, {
//             parse_mode: 'HTML',
//             reply_markup: {
//                 inline_keyboard: [[
//                     { text: 'Artist Profile', callback_data: `artist_${el.id}` }, { text: 'Visit Artist Spotify', url: `${el.external_urls.spotify}` }
//                 ]]
//             }
//         });
//     });

//     // return htmlString;

//     return;

// }







bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (userState[chatId]) {

        userState[chatId].pending = null;
        userState[chatId].response = [];
        userState[chatId].current = 0;
        userState[chatId].state = null;
    }
    const message = `
Welcome to *Spotify Finder Bot*.

You can use this bot to find:
- *Playlist*
- *Artist Profile*
- *Tracks from Spotify*

Developed by [Joshua](http://google.com)
    `;

    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: 'Search Artist', callback_data: 'search_artist' },
                { text: 'Search Track', callback_data: 'search_track' }
            ]]
        }
    });
});



// getting a callback query from bot
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;

    let currentTime = Date.now() / 1000;
    if (!expiryTime || ((currentTime - expiryTime) > 0)) {
        await getToken();
    }

    // callback data is same as state key e.g search_artist
    const data = callbackQuery.data.split(':')[0];
    const param = callbackQuery.data.split(':')[1];
    let state_length;
    switch (data) {
        case 'search_artist':
            state_length = msgState['search_artist'].length;

            // creating a state for user to track user current activity instead of a database
            // if(!userState[chat])
            userState[chatId] = {
                current: 1,
                state: 'search_artist'
            };

            // checking is message state and user state is still valid to check the stage where the user is
            if (userState[chatId].current <= state_length) {

                bot.sendMessage(chatId, msgState['search_artist'].question[userState[chatId].current]);

                // Incrementing the user state to track next message
                userState[chatId].pending = 1;
                userState[chatId].response = [];

                userState[chatId].current++;
            }
            break;


        case 'artist_profile':
            const artist = await get_artist(param, accessToken, axios);
            // console.log(artist);
            const imageUrl = artist.images[0].url;
            const genres = artist.genres
            const followers = artist.followers.total
            const name = artist.name;

            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(response.data, 'binary');

            const tracks = await get_top_tracks(param, accessToken, axios);
            // console.log(tracks);
            let topTracks = ``;
            tracks.tracks.forEach(async song => {
                // console.log(song.album);
                const title = song.name;
                const mins = Math.floor(song.duration_ms / 60000);
                const secs = Math.floor(song.duration_ms % 60000);
                const duration = mins + '.' + Number(secs);
                const album = song.album.name

                topTracks = topTracks + `${title} || ${Number(duration).toFixed(2)}mins \nAlbum: ${album} \n\n`;
                // const artist = 

            })

            const captionText = `<b>Artist Name:</b> ${name} \n\n<b>Genre:</b> ${genres} \n\n<b>Followers:</b> ${followers} \n\n<a href="${artist.external_urls.spotify}">View on Spotify</a> \n\n <b>Top Tracks</b> \n\n ${topTracks}`;

            bot.sendPhoto(chatId, imageBuffer, { caption: captionText, parse_mode: 'HTML' });

            break;

        case 'search_track':
            state_length = msgState['search_track'].length;

            // creating a state for user to track user current activity instead of a database
            // if(!userState[chat])
            userState[chatId] = {
                current: 1,
                state: 'search_track'
            };

            // checking is message state and user state is still valid to check the stage where the user is
            if (userState[chatId].current <= state_length) {

                bot.sendMessage(chatId, msgState['search_track'].question[userState[chatId].current]);

                // Incrementing the user state to track next message
                userState[chatId].pending = 1;
                userState[chatId].response = [];

                userState[chatId].current++;
            }
            break;






        default:
            break;
    }


});




bot.on('message', async (query) => {
    const chatId = query.chat.id;
    const message = query.text;

    // checking access token expiration
    let currentTime = Date.now() / 1000;
    if (!expiryTime || ((currentTime - expiryTime) > 0)) {
        await getToken();
    }




    // checks if user exist on user state else loads the start message
    if (userState[chatId] && userState[chatId].current != 0 /* && userState[chatId] != 'end'*/) {



        // we check if there is a pending question then if tere is a pending question, we appewnd the reply to an array of response and set pending question to null
        if ((userState[chatId].state && userState[chatId].state != null) && (userState[chatId].pending && userState[chatId].pending != null)) {
            userState[chatId].pending = null;
            userState[chatId].response.push(message)
            console.log(userState[chatId]);
        } else {
            // send user a default response of the start message
        }




        if (userState[chatId].state == 'search_artist' && userState[chatId].current > msgState.search_artist.length) {



            find_artist_by_name(userState[chatId].response[0], 'artist', 0, userState[chatId].response[1], chatId, expiryTime, accessToken, axios, bot);

        } else if (userState[chatId].state == 'search_track' && userState[chatId].current > msgState.search_artist.length) {



            const tracks = await search_track(userState[chatId].response[0], 'track', 0, userState[chatId].response[1], chatId, expiryTime, accessToken, axios, bot);
            let topTracks;
            // looping through the tracks
            tracks.forEach(song => {
                // console.log(song.artists);
                const artist_arr = song.artists;
                const title = song.name;
                const mins = Math.floor(song.duration_ms / 60000);
                const secs = Math.floor(song.duration_ms % 60000);
                const duration = mins + '.' + Number(secs);
                const album = song.album.name;
                let artists = [];

                artist_arr.forEach(ar => {


                    artists.push(`<a href="${ar.external_urls.spotify}">${ar.name}</a>`);
                })
                const author = artists.join(', ');

                const message = `${title}  \nDuration: ${Number(duration).toFixed(2)}mins \nAlbum: ${album} \n\n<a href="${song.external_urls.spotify}">Listen on Spotify 🔥</a> \n\nArtists: ${author}`;
                bot.sendMessage(chatId, message, {
                    parse_mode: 'HTML'
                });

            })


        } else if (userState[chatId].current <= msgState[userState[chatId].state].length) {

            bot.sendMessage(chatId, msgState[userState[chatId].state].question[userState[chatId].current]);
            userState[chatId].pending = userState[chatId].current;
            userState[chatId].current++;

        }

    } else if (message != '/start') {
        bot.sendMessage(chatId, 'Click /start to use the bot');
    }
});