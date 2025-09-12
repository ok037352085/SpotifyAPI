<script setup>
import { ref, onMounted } from "vue";
import { generateCodeVerifier, generateCodeChallenge } from "./utils/pkce.js";

const clientId = "f53ab351c2f84d3fb31dd98a408ce5e2";
const redirectUri = "https://ok037352085.github.io/SpotifyAPI/callback";
const scopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing"
].join(" ");

const accessToken = ref(null);
const query = ref("");
const results = ref([]);
const player = ref(null);
const deviceId = ref(null);

/** Step 1: 登入 Spotify (PKCE Flow) */
const loginWithSpotify = async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("pkce_verifier", verifier);

  const url = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&code_challenge_method=S256&code_challenge=${challenge}`;
  window.location.href = url;
};

/** Step 2: 解析回傳 code 並交換 token */
const handleCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return;

  const verifier = localStorage.getItem("pkce_verifier");
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await res.json();
  accessToken.value = data.access_token;
  localStorage.setItem("spotify_token", data.access_token);

  window.history.replaceState({}, null, "/SpotifyAPI/"); // 清掉 ?code
  initPlayer();
};

/** Step 3: 初始化 Spotify Web Playback SDK */
const initPlayer = () => {
  if (!accessToken.value || !window.Spotify) return;

  player.value = new Spotify.Player({
    name: "Vue Spotify Player",
    getOAuthToken: cb => cb(accessToken.value),
    volume: 0.5
  });

  player.value.addListener("ready", ({ device_id }) => {
    deviceId.value = device_id;
    console.log("Spotify Player Ready, Device ID:", device_id);
  });

  player.value.addListener("initialization_error", ({ message }) => console.error(message));
  player.value.addListener("authentication_error", ({ message }) => console.error(message));
  player.value.addListener("account_error", ({ message }) => console.error(message));
  player.value.addListener("playback_error", ({ message }) => console.error(message));

  player.value.connect();
};

/** Step 4: 搜尋歌曲 */
const searchTracks = async () => {
  if (!accessToken.value) return alert("請先登入 Spotify");
  const res = await fetch(`https://api.spotify.com/v1/search?q=${query.value}&type=track&limit=5`, {
    headers: { Authorization: `Bearer ${accessToken.value}` }
  });
  const data = await res.json();
  results.value = data.tracks.items;
};

/** Step 5: 播放歌曲 */
const playTrack = async uri => {
  if (!accessToken.value || !deviceId.value) return alert("播放器尚未就緒");
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId.value}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken.value}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ uris: [uri] })
  });
};

onMounted(() => {
  if (window.location.pathname.endsWith("/callback")) {
    handleCallback();
  } else {
    const token = localStorage.getItem("spotify_token");
    if (token) {
      accessToken.value = token;
      initPlayer();
    }
  }
});
</script>

<template>
  <div class="container">
    <h1>PlayingWithTheAPI</h1>
    <div v-if="!accessToken">
      <button @click="loginWithSpotify">使用 Spotify 登入</button>
    </div>
    <div v-else>
      <div class="search">
        <input v-model="query" placeholder="搜尋歌曲..." />
        <button @click="searchTracks">搜尋</button>
      </div>
      <ul>
        <li v-for="track in results" :key="track.id">
          {{ track.name }} - {{ track.artists[0].name }}
          <button @click="playTrack(track.uri)">播放</button>
        </li>
      </ul>
    </div>
  </div>
</template>


<style scoped>
.container {
  background: #111;
  color: #fff;
  width: max-content;
  margin: 100px auto;
  border: 4px solid #000;
  border-radius: 40px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
}
.search {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.search input {
  padding: 10px;
  border-radius: 20px;
  border: none;
}
.search-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}
.play-btn {
  border-radius: 20px;
  padding: 5px 10px;
}
button {
  background: #fff;
  transition: 0.5s;
}
button:hover {
  background: #999;
}
</style>
