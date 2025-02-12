// ✅ Replace with your valid YouTube API Key (Better to use backend for security)
const API_KEY = "AIzaSyBvmq-t57o4D3os2m7jmhGlw80ymgnSJws";

const analyzeButton = document.getElementById("analyzebutton");
const resultsSection = document.querySelector(".results");
const playlistLinks = document.getElementById("playlist-links");
const rangeStart = document.getElementById("range-start");
const rangeEnd = document.getElementById("range-end");
const customSpeed = document.getElementById("custom-speed");
const darkModeToggle = document.getElementById("dark-mode-toggle");

// ✅ Hide results initially
resultsSection.style.display = "none";

analyzeButton.addEventListener("click", async () => {  
    setTimeout(() => {
        window.scrollBy({
            top: 350, // Adjust this value as needed
            behavior: "smooth"
        });
    }, 0);
})

// ✅ Dark Mode Toggle
darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
});

// ✅ Handle Analyze Button Click
analyzeButton.addEventListener("click", async () => {
    const playlistId = extractPlaylistId(playlistLinks.value);
    if (!playlistId) {
        resultsSection.innerHTML = `
            <p style="color: red; font-size: 1.2em; font-weight: bold; text-align: center;">
                No valid playlist or video IDs found in input.
            </p>
        `;
        resultsSection.style.display = "block";
        return;
    }
    

    const start = parseInt(rangeStart.value) || 1;
    const end = parseInt(rangeEnd.value) || 500;
    const speed = parseFloat(customSpeed.value) || 1;

    // ✅ Fetch playlist metadata (title & creator)
    const { title, creator } = await fetchPlaylistMetadata(playlistId);

    // ✅ Fetch video details
    const { count, duration } = await fetchPlaylistDetails(playlistId, start, end);

    // ✅ Display results
    displayResults({ title, creator, count, duration }, speed);
});

// ✅ Extract Playlist ID from URL
function extractPlaylistId(link) {
    let match = link.match(/(?:list=|\/playlist\?list=|youtu\.be\/[\w-]+\?list=)([\w-]+)/);
    return match ? match[1] : null;
}

// ✅ Fetch Playlist Metadata (Title & Creator)
async function fetchPlaylistMetadata(playlistId) {
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            return {
                title: data.items[0].snippet.title, // ✅ Playlist Name
                creator: data.items[0].snippet.channelTitle // ✅ Creator Name
            };
        }
        return { title: "Unknown", creator: "Unknown" };
    } catch (error) {
        console.error("Error fetching playlist metadata:", error);
        return { title: "Error", creator: "Error" };
    }
}

// ✅ Fetch Playlist Video Details
async function fetchPlaylistDetails(playlistId, start, end) {
    let videoIds = [];
    let nextPageToken = null;
    let totalDuration = 0;

    try {
        do {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken || ""}&key=${API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            if (data.items) {
                videoIds.push(...data.items.map(item => item.contentDetails.videoId));
                nextPageToken = data.nextPageToken;
            } else {
                nextPageToken = null;
            }
        } while (nextPageToken && videoIds.length < end);

        videoIds = videoIds.slice(start - 1, end);

        if (videoIds.length > 0) {
            totalDuration = await fetchTotalDuration(videoIds);
        }

        return { count: videoIds.length, duration: totalDuration };
    } catch (error) {
        console.error("Error fetching playlist details:", error);
        alert("Failed to fetch playlist data. Please try again later.");
        return { count: 0, duration: 0 };
    }
}

// ✅ Fetch Video Durations
async function fetchTotalDuration(videoIds) {
    let totalSeconds = 0;
    for (let i = 0; i < videoIds.length; i += 50) {
        const batch = videoIds.slice(i, i + 50);
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(",")}&key=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        if (data.items) {
            totalSeconds += data.items.reduce((acc, item) => acc + parseDuration(item.contentDetails.duration), 0);
        }
    }
    return totalSeconds;
}

// ✅ Convert ISO 8601 Duration Format to Seconds
function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;
    return hours * 3600 + minutes * 60 + seconds;
}

// ✅ Display Results with Playlist Title & Creator
function displayResults({ title, creator, count, duration }, speed) {
    let resultsHTML = `
        <p><strong><span style="font-size: 1.5em; font-family: Quicksand;"> Playlist : ${title}</span></strong></p>
        <p><span style="font-size: 1.3em; font-family: Quicksand;"> Creator : ${creator}</p>
        <p>ID: ${extractPlaylistId(playlistLinks.value)}</p>
        <p>Video count : ${count}</p>
        <p>Total length : ${formatDuration(duration)}</p>
        <p>At 1.25x : ${formatDuration(duration / 1.25)}</p>
        <p>At 1.50x : ${formatDuration(duration / 1.5)}</p>
        <p>At 1.75x : ${formatDuration(duration / 1.75)}</p>
        <p>At 2.00x : ${formatDuration(duration / 2)}</p>
        
    `;

    // ✅ Include custom speed result if valid
    if (speed > 0 && speed !==  1) {
        resultsHTML += `<p>At ${speed}x: ${formatDuration(duration / speed)}</p>`;
    }

    resultsSection.innerHTML = resultsHTML;
    resultsSection.style.display = "block";
}

// ✅ Format Duration into Hours, Minutes, Seconds
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
}
