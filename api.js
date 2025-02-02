require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3031;
const API_KEY = process.env.YT_API_KEY;
const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YT_VIDEO_URL = 'https://www.googleapis.com/youtube/v3/videos';

// Function to format ISO 8601 duration (PT4M13S → 4:13)
function formatDuration(duration) {
    let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    let hours = match[1] ? match[1].replace('H', '') : 0;
    let minutes = match[2] ? match[2].replace('M', '') : 0;
    let seconds = match[3] ? match[3].replace('S', '') : 0;
    
    let formatted = hours > 0 ? `${hours}:` : '';
    formatted += `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    return formatted;
}

// Function to get the current time in 12-hour format
function getCurrentTime12HourFormat() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
}

app.get('/ytsearch', async (req, res) => {
    const { title } = req.query;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    try {
        // Step 1: Search for videos
        const searchResponse = await axios.get(YT_SEARCH_URL, {
            params: {
                key: API_KEY,
                q: title,
                part: 'snippet',
                type: 'video',
                maxResults: 10,
            },
        });

        const videos = searchResponse.data.items;
        const videoIds = videos.map(item => item.id.videoId).join(',');

        // Step 2: Get video durations
        const videoResponse = await axios.get(YT_VIDEO_URL, {
            params: {
                key: API_KEY,
                id: videoIds,
                part: 'contentDetails',
            },
        });

        const videoDetails = videoResponse.data.items;

        // Step 3: Combine search results with duration
        const results = videos.map(item => {
            const videoDetail = videoDetails.find(v => v.id === item.id.videoId);
            return {
                title: item.snippet.title,
                videoId: item.id.videoId,
                link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                thumbnail: item.snippet.thumbnails.high.url,
                channel: item.snippet.channelTitle,
                duration: videoDetail ? formatDuration(videoDetail.contentDetails.duration) : 'Unknown',
            };
        });

        res.json({
            timestamp: getCurrentTime12HourFormat(),
            results,
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching YouTube data', details: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
