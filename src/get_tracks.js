export async function get_top_tracks(param, accessToken, axios) {
    try {

        // checking if param is empty
        if (!param || param == null) return;

        // const queryData = `${encodeURIComponent(`artist:${artist}`)}&type=${type}&offset=${offset}&limit=${limit}`;
        const query = `https://api.spotify.com/v1/artists/${param}/top-tracks`;

        const headers = `Authorization: Bearer ${accessToken}`;

        const response = await axios.get(query, { headers });


        return response.data;
    } catch (error) {
        console.log(error);
    }

}