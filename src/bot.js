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
    },

    get_track: {
        question: {
            1: 'Enter Track Id:'
        },
        length: 0,
    },

    get_artist: {
        question: {
            1: 'Enter Artist Id:'
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
const getAccessToken = async () => {
    try {
        const queryData = querystring.stringify({
            grant_type: 'client_credentials',
            client_id: client_id,
            client_secret: client_secret
        })

        const headers = 'Content-Type: application/x-www-form-urlencoded';
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

}


// getting a callback query from bot
bot.on('callback_query', async (callbackQuery) => {
    bot.answerCallbackQuery(callbackQuery.id)
    await getToken()

    // console.log(callbackQuery);
    const message = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    // console.log(message);
    const data = message.split(':')[0];
    const param = message.split(':')[1];

    // search artist from callback query
    if (data == 'find_artist') {
        resetUser(chatId)

        if (param) {
            find_artist_by_name(param, 'artist', 0, 5, chatId, expiryTime, accessToken, axios, bot);

            resetUser(chatId);
        } else {

            await sendQuestion('search_artist', 1, chatId);

        }
    }


    // search track
    if (data == 'find_track') {

        resetUser(chatId)

        if (param) {

            const tracks = await search_track(param, 'track', 0, 5, chatId, expiryTime, accessToken, axios, bot);
            sendTrack(tracks, chatId);
            resetUser(chatId);
        } else {

            await sendQuestion('search_track', 1, chatId);

        }
    }


    // get artist
    if (data == 'get_artist') {
        resetUser(chatId)

        if (param) {
            const artist = await get_artist(param, accessToken, axios);
            await send_artist(artist, param, chatId)
            resetUser(chatId);
        } else {

            await sendQuestion('get_artist', 1, chatId);

        }
    }


});

bot.on('message', async (query) => {
    const chatId = query.chat.id;
    const message = query.text;
    await getToken()

    if (message === '/start') {
        startMessage(chatId);

    }

    if (message.startsWith('/find_artist')) {
        // const data = message.split(':')[0];
        const param = message.split(':')[1];
        resetUser(chatId)

        if (param) {
            find_artist_by_name(param, 'artist', 0, 5, chatId, expiryTime, accessToken, axios, bot);

            resetUser(chatId);
        } else {

            await sendQuestion('search_artist', 1, chatId);

        }

    }

    if (message.startsWith('/get_artist')) {
        // const data = message.split(':')[0];
        const param = message.split(':')[1];
        resetUser(chatId)

        if (param) {
            const artist = await get_artist(param, accessToken, axios);
            await send_artist(artist, param, chatId)
            resetUser(chatId);
        } else {

            await sendQuestion('get_artist', 1, chatId);

        }

    }

    if (message.startsWith('/find_track')) {
        // const data = message.split(':')[0];
        const param = message.split(':')[1];
        resetUser(chatId)

        if (param) {

            const tracks = await search_track(param, 'track', 0, 5, chatId, expiryTime, accessToken, axios, bot);
            sendTrack(tracks, chatId);
            resetUser(chatId);
        } else {

            await sendQuestion('search_track', 1, chatId);

        }

    }


    // srearch artist if statement
    if (userState[chatId] && userState[chatId].state === 'search_artist' && userState[chatId].pending != null && !message.startsWith('/')) {

        // console.log(userState[chatId]);

        userState[chatId].pending = null;
        userState[chatId].response.push(message);

        if (userState[chatId].current > msgState.search_artist.length) {

            find_artist_by_name(userState[chatId].response[0], 'artist', 0, userState[chatId].response[1], chatId, expiryTime, accessToken, axios, bot);
            // clear object
            resetUser();

        } else if (userState[chatId].current <= msgState.search_artist.length) {
            await sendQuestion('search_artist', userState[chatId].current, chatId);

        }

    }



    // get artist if statement
    if (userState[chatId] && userState[chatId].state === 'get_artist' && userState[chatId].pending != null && !message.startsWith('/')) {

        userState[chatId].pending = null;
        userState[chatId].response.push(message);

        if (userState[chatId].current > msgState.search_artist.length) {
            const artist = await get_artist(param, accessToken, axios);
            await send_artist(artist, param, chatId)
            resetUser(chatId);

        } else if (userState[chatId].current <= msgState.search_artist.length) {
            await sendQuestion('get_artist', userState[chatId].current, chatId);

        }

    }



    // search track if statement
    if (userState[chatId] && userState[chatId].state === 'search_track' && userState[chatId].pending != null && !message.startsWith('/')) {

        // console.log(userState[chatId]);

        userState[chatId].pending = null;
        userState[chatId].response.push(message);

        if (userState[chatId].current > msgState.search_track.length) {

            const tracks = await search_track(userState[chatId].response[0], 'track', 0, userState[chatId].response[1], chatId, expiryTime, accessToken, axios, bot);
            sendTrack(tracks, chatId)
            // clear object
            resetUser();

        } else if (userState[chatId].current <= msgState.search_track.length) {
            await sendQuestion('search_track', userState[chatId].current, chatId);

        }

    }

    if (!userState[chatId] && !message.startsWith('/start')) {
        bot.sendMessage(chatId, 'Hey👋, Click the start button to start the bot', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Start', callback_data: 'start' },
                ]]
            }
        });
    }
})

async function sendQuestion(key, questionId, chatId) {
    const state_length = msgState[key].length;

    // creating a state for user to track user current activity instead of a database
    userState[chatId].current = questionId;
    userState[chatId].state = key;


    // checking is message state and user state is still valid to check the stage where the user is
    if (userState[chatId].current <= state_length) {
        bot.sendMessage(chatId, msgState[key].question[userState[chatId].current]);

        // Incrementing the user state to track next message
        userState[chatId].pending = questionId;
        userState[chatId].current++;
    }

}

function resetUser(chatId) {
    if (!userState[chatId]) {
        userState[chatId] = {
            pending: '',
            state: '',
            response: [],
            current: 0
        }

    } else {

        userState[chatId].pending = userState[chatId].state = '';
        userState[chatId].response = [];
        userState[chatId].current = 0;
    }
}

function startMessage(chatId) {

    resetUser(chatId);
    const message = `
        Welcome to *Spotify Finder Bot*.

        You can use this bot to find:
        - *Playlist*
        - *Artist Profile*
        - *Tracks from Spotify*

Developed by @randytech01
            `;

    bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: 'Find Artist', callback_data: 'find_artist' },
                { text: 'Find Track', callback_data: 'find_track' }
            ],
            [
                { text: 'Get Artist via Spoify Id', callback_data: 'get_artist' }
            ]]
        }
    });
}
function sendTrack(tracks, chatId) {

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
}

async function send_artist(artist, artist_id, chatId) {

    const imageUrl = artist.images[0].url;
    const genres = artist.genres
    const followers = artist.followers.total
    const name = artist.name;

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');

    const tracks = await get_top_tracks(artist_id, accessToken, axios);
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
}