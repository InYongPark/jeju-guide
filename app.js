const tripStart = new Date('2026-08-23T04:00:00+09:00');
const countdown = document.querySelector('#countdown');
const restaurants = [
  { name: '중문흑돼지천국', category: '흑돼지', note: '중문 흑돼지 후보', query: '중문흑돼지천국 제주' },
  { name: '기원은갈치', category: '갈치조림', note: '중문 통갈치조림구이', query: '기원은갈치 제주' },
  { name: '한라산아래 첫마을', category: '한식', note: '부모님 모시기 좋은 곳', query: '한라산아래첫마을 제주' },
  { name: '바람에 스치운다', category: '한식', note: '아이와 함께 가기 좋은 후보', query: '바람에스치운다 제주' },
  { name: '담백', category: '한식', note: '아이와 함께 가기 좋은 후보', query: '담백 제주 맛집' },
  { name: '리볼버', category: '양고기', note: '메쉬포테이토 · 데이트', query: '리볼버 제주 양고기' },
  { name: '연리지 가든', category: '돼지고기', note: '돼지고기 후보', query: '연리지 가든 제주' },
  { name: '밀밀스', category: '피자', note: '피자 후보', query: '밀밀스 제주' },
  { name: '요리바카', category: '배달', note: '배달 가능한 맛집', query: '요리바카 제주' },
  { name: '평대성게국수', category: '로컬', note: '로컬 분위기 성게국수', query: '평대성게국수 제주' },
  { name: '위이', category: '카페', note: '좋은 카페', query: '위이 카페 제주' },
  { name: '백한철꽈배기', category: '간식', note: '꽈배기', query: '백한철꽈배기 제주' },
  { name: '시스터필드', category: '베이커리', note: '식빵', query: '시스터필드 제주' },
  { name: '플라워웨이브', category: '베이커리', note: '베이커리', query: '플라워웨이브 제주' },
  { name: '로빙화', category: '이색', note: '이색적인 후보', query: '로빙화 제주' },
  { name: '수리코', category: '맛집', note: '웨이팅 가능', query: '수리코 제주' },
];

let map;
let mapStarted = false;
let userMarker;
let userLocation;
const restaurantMarkers = new Map();

function updateCountdown() {
  const diff = tripStart - new Date();
  if (diff <= 0) { countdown.textContent = '제주 여행 일정'; return; }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  countdown.textContent = `출발까지 ${days}일 ${hours}시간`;
}

function kakaoSearchUrl(query) { return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`; }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

function renderRestaurantCards() {
  document.querySelector('#food-list').innerHTML = restaurants.map((place, index) => `
    <article class="place-card" data-place-index="${index}">
      <p class="place-category">${place.category}</p><h3>${place.name}</h3><p>${place.note}</p>
      <p class="distance" data-distance="${index}">위치 확인 중…</p>
      <button class="map-link-button" type="button" data-show-place="${index}" disabled>지도에서 보기</button>
      <a href="${kakaoSearchUrl(place.query)}" target="_blank" rel="noreferrer">카카오맵 ↗</a>
    </article>`).join('');
  document.querySelectorAll('[data-show-place]').forEach((button) => button.addEventListener('click', () => focusPlace(Number(button.dataset.showPlace))));
}

function distanceInMeters(from, to) {
  const radians = (number) => number * Math.PI / 180;
  const earthRadius = 6371000;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateDistances() {
  restaurants.forEach((place, index) => {
    const distanceElement = document.querySelector(`[data-distance="${index}"]`);
    if (!distanceElement) return;
    if (!place.coordinates) { distanceElement.textContent = place.notFound ? '위치를 찾지 못했어요' : '위치 확인 중…'; return; }
    if (!userLocation) { distanceElement.textContent = '내 위치 확인 후 거리 표시'; return; }
    const meters = distanceInMeters(userLocation, place.coordinates);
    distanceElement.textContent = meters >= 1000 ? `현재 위치에서 ${(meters / 1000).toFixed(1)} km` : `현재 위치에서 ${Math.round(meters)} m`;
  });
}

function setLocation(position) {
  userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
  if (userMarker) userMarker.setLatLng(userLocation);
  else userMarker = L.marker(userLocation, { title: '현재 위치' }).addTo(map).bindPopup('<strong>현재 위치</strong>');
  map.flyTo(userLocation, 13, { duration: 0.7 });
  document.querySelector('#location-message').textContent = '현재 위치를 표시했어요. 아래 카드에 직선거리가 표시됩니다.';
  updateDistances();
}

function addRestaurantMarker(place, index) {
  const marker = L.marker(place.coordinates, { title: place.name }).addTo(map);
  marker.bindPopup(`<strong>${escapeHtml(place.name)}</strong><p>${escapeHtml(place.note)}</p><a href="${kakaoSearchUrl(place.query)}" target="_blank" rel="noreferrer">카카오맵에서 보기 ↗</a>`);
  restaurantMarkers.set(index, marker);
  const button = document.querySelector(`[data-show-place="${index}"]`);
  if (button) button.disabled = false;
}

function focusPlace(index) {
  const marker = restaurantMarkers.get(index);
  if (!marker) return;
  map.flyTo(marker.getLatLng(), 14, { duration: 0.7 });
  marker.openPopup();
  document.querySelector('#food-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showAllRestaurants() {
  const locations = [...restaurantMarkers.values()].map((marker) => marker.getLatLng());
  if (userLocation) locations.push(userLocation);
  if (locations.length) map.fitBounds(L.latLngBounds(locations).pad(0.18));
}

function readCachedLocation(query) { try { return JSON.parse(localStorage.getItem(`jeju-place-${query}`)); } catch { return null; } }
function cacheLocation(query, coordinates) { try { localStorage.setItem(`jeju-place-${query}`, JSON.stringify(coordinates)); } catch { /* Private browsing can disable storage. */ } }

async function geocodePlace(place) {
  const cached = readCachedLocation(place.query);
  if (cached?.lat && cached?.lng) return cached;
  const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kr&q=${encodeURIComponent(`${place.query}, 제주특별자치도`)}`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Geocoding request failed');
  const results = await response.json();
  if (!results.length) return null;
  const coordinates = { lat: Number(results[0].lat), lng: Number(results[0].lon) };
  cacheLocation(place.query, coordinates);
  return coordinates;
}

async function loadRestaurantLocations() {
  const status = document.querySelector('#map-status');
  let found = 0;
  for (const [index, place] of restaurants.entries()) {
    try {
      place.coordinates = await geocodePlace(place);
      if (place.coordinates) { addRestaurantMarker(place, index); found += 1; } else place.notFound = true;
    } catch { place.notFound = true; }
    updateDistances();
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  status.querySelector('strong').textContent = found ? `추천 맛집 ${found}곳을 지도에 표시했어요` : '맛집 위치를 불러오지 못했어요';
  status.querySelector('p').textContent = found ? '마커를 누르면 카카오맵으로 이어집니다.' : '카카오맵 링크로 각 장소를 직접 확인해 주세요.';
  status.classList.add('is-hidden');
  if (found) showAllRestaurants();
}

function initializeMap() {
  if (mapStarted) { setTimeout(() => map.invalidateSize(), 0); return; }
  mapStarted = true;
  if (!window.L) { document.querySelector('#map-status').innerHTML = '<strong>지도를 불러오지 못했어요</strong><p>네트워크 연결 후 새로고침해 주세요.</p>'; return; }
  map = L.map('food-map', { zoomControl: false }).setView([33.38, 126.55], 10);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  setTimeout(() => document.querySelector('#map-status').classList.add('is-hidden'), 400);
  loadRestaurantLocations();
}

updateCountdown();
renderRestaurantCards();
document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach((item) => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-selected', item === button); });
  document.querySelectorAll('.panel').forEach((panel) => { const active = panel.id === button.dataset.tab; panel.classList.toggle('is-active', active); panel.hidden = !active; });
  if (button.dataset.tab === 'food') initializeMap();
}));
document.querySelectorAll('.day-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.day-button').forEach((item) => item.classList.toggle('is-active', item === button));
  document.querySelectorAll('[data-timeline]').forEach((timeline) => timeline.classList.toggle('is-hidden', timeline.dataset.timeline !== button.dataset.day));
}));
document.querySelector('#location-button').addEventListener('click', () => {
  const message = document.querySelector('#location-message');
  initializeMap();
  if (!navigator.geolocation) { message.textContent = '이 브라우저에서는 현재 위치를 지원하지 않습니다.'; return; }
  message.textContent = '현재 위치를 확인하고 있어요…';
  navigator.geolocation.getCurrentPosition(setLocation, () => { message.textContent = '위치 권한이 필요합니다. 브라우저 설정에서 위치 접근을 허용해 주세요.'; }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
});
document.querySelector('#map-all-button').addEventListener('click', showAllRestaurants);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
