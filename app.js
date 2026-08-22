const tripStart = new Date('2026-08-23T04:00:00+09:00');
const countdown = document.querySelector('#countdown');
const jejuCenter = [33.38, 126.55];
const restaurants = [
  ['중문흑돼지천국', '흑돼지', '중문 흑돼지 후보'], ['기원은갈치', '갈치조림', '중문 통갈치조림구이'],
  ['한라산아래 첫마을', '한식', '부모님 모시기 좋은 곳'], ['바람에 스치운다', '한식', '아이와 함께 가기 좋은 후보'],
  ['담백', '한식', '아이와 함께 가기 좋은 후보'], ['리볼버', '양고기', '메쉬포테이토 · 데이트'],
  ['연리지 가든', '돼지고기', '돼지고기 후보'], ['밀밀스', '피자', '피자 후보'],
  ['요리바카', '배달', '배달 가능한 맛집'], ['평대성게국수', '로컬', '로컬 분위기 성게국수'],
  ['위이', '카페', '좋은 카페'], ['백한철꽈배기', '간식', '꽈배기'],
  ['시스터필드', '베이커리', '식빵'], ['플라워웨이브', '베이커리', '베이커리'],
  ['로빙화', '이색', '이색적인 후보'], ['수리코', '맛집', '웨이팅 가능'],
].map(([name, category, note]) => ({ name, category, note }));

let map;
let mapStarted = false;
let placesStarted = false;
let userMarker;
let userLocation;
let locationTimeout;
const restaurantMarkers = new Map();

function updateCountdown() {
  const diff = tripStart - new Date();
  if (diff <= 0) { countdown.textContent = '제주 여행 일정'; return; }
  countdown.textContent = `출발까지 ${Math.floor(diff / 86400000)}일 ${Math.floor((diff % 86400000) / 3600000)}시간`;
}

function kakaoSearchUrl(name) { return `https://map.kakao.com/link/search/${encodeURIComponent(`${name} 제주`)}`; }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

function renderRestaurantCards() {
  document.querySelector('#food-list').innerHTML = restaurants.map((place, index) => `
    <article class="place-card">
      <p class="place-category">${place.category}</p><h3>${place.name}</h3><p>${place.note}</p>
      <p class="distance" data-distance="${index}">장소 위치를 불러오는 중…</p>
      <button class="map-link-button" type="button" data-show-place="${index}" disabled>지도에서 보기</button>
      <a href="${kakaoSearchUrl(place.name)}" target="_blank" rel="noreferrer">카카오맵 ↗</a>
    </article>`).join('');
  document.querySelectorAll('[data-show-place]').forEach((button) => button.addEventListener('click', () => focusPlace(Number(button.dataset.showPlace))));
}

function distanceInMeters(from, to) {
  const radians = (value) => value * Math.PI / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateDistances() {
  restaurants.forEach((place, index) => {
    const element = document.querySelector(`[data-distance="${index}"]`);
    if (!element) return;
    if (!place.coordinates) { element.textContent = place.notFound ? '장소 위치를 찾지 못했어요' : '장소 위치를 불러오는 중…'; return; }
    if (!userLocation) { element.textContent = '내 위치 확인 후 거리 표시'; return; }
    const meters = distanceInMeters(userLocation, place.coordinates);
    element.textContent = meters >= 1000 ? `현재 위치에서 ${(meters / 1000).toFixed(1)} km` : `현재 위치에서 ${Math.round(meters)} m`;
  });
}

function addRestaurantMarker(place, index) {
  const marker = L.circleMarker([place.coordinates.lat, place.coordinates.lng], {
    radius: 7, color: '#ffffff', weight: 2, fillColor: '#dd654e', fillOpacity: 1,
  }).addTo(map).bindPopup(`<strong>${escapeHtml(place.name)}</strong><p>${escapeHtml(place.note)}</p><a href="${kakaoSearchUrl(place.name)}" target="_blank" rel="noreferrer">카카오맵에서 보기 ↗</a>`);
  restaurantMarkers.set(index, marker);
  document.querySelector(`[data-show-place="${index}"]`).disabled = false;
}

function focusPlace(index) {
  const marker = restaurantMarkers.get(index);
  if (!marker) return;
  map.flyTo(marker.getLatLng(), 14, { duration: 0.6 });
  marker.openPopup();
  document.querySelector('#food-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showAllPlaces() {
  const points = [...restaurantMarkers.values()].map((marker) => marker.getLatLng());
  if (userLocation) points.push(userLocation);
  if (points.length) map.fitBounds(L.latLngBounds(points).pad(0.15));
  else map.flyTo(jejuCenter, 10, { duration: 0.6 });
}

function loadKakaoPlaces() {
  const key = window.JEJU_CONFIG?.kakaoJavaScriptKey;
  if (!key) return Promise.reject(new Error('missing-key'));
  if (window.kakao?.maps?.services) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    script.onload = () => window.kakao.maps.load(resolve);
    script.onerror = reject;
    document.head.append(script);
  });
}

function findPlace(search, places) {
  return new Promise((resolve) => places.keywordSearch(`${search} 제주`, (results, status) => {
    if (status !== kakao.maps.services.Status.OK || !results.length) { resolve(null); return; }
    resolve({ lat: Number(results[0].y), lng: Number(results[0].x) });
  }));
}

async function loadRestaurantLocations() {
  if (placesStarted) return;
  placesStarted = true;
  const status = document.querySelector('#map-status');
  try {
    await loadKakaoPlaces();
    const places = new kakao.maps.services.Places();
    let found = 0;
    for (const [index, place] of restaurants.entries()) {
      place.coordinates = await findPlace(place.name, places);
      if (place.coordinates) { addRestaurantMarker(place, index); found += 1; } else place.notFound = true;
      updateDistances();
    }
    status.querySelector('strong').textContent = `추천 맛집 ${found}곳을 지도에 표시했어요`;
    status.querySelector('p').textContent = '내 위치를 누르면 맛집별 직선거리가 카드에 표시됩니다.';
    setTimeout(() => status.classList.add('is-hidden'), 1200);
    showAllPlaces();
  } catch (error) {
    document.querySelector('#location-message').textContent = error.message === 'missing-key' ? '카카오 JavaScript 키를 config.js에 넣으면 맛집 핀과 거리가 표시됩니다.' : '카카오 장소 검색을 불러오지 못했어요. 키와 등록 도메인을 확인해 주세요.';
    restaurants.forEach((place, index) => { place.notFound = true; const element = document.querySelector(`[data-distance="${index}"]`); if (element) element.textContent = '카카오맵 링크에서 위치 확인'; });
    status.classList.add('is-hidden');
  }
}

function initializeMap() {
  if (mapStarted) { setTimeout(() => map.invalidateSize(), 0); return; }
  mapStarted = true;
  const status = document.querySelector('#map-status');
  if (!window.L) { status.innerHTML = '<strong>지도를 불러오지 못했어요</strong><p>페이지를 새로고침해 주세요.</p>'; return; }
  map = L.map('food-map', { zoomControl: false }).setView(jejuCenter, 10);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  loadRestaurantLocations();
}

function showLocationError(error) {
  clearTimeout(locationTimeout);
  const messages = { 1: '위치 권한이 꺼져 있어요. 주소창 왼쪽 설정에서 위치를 허용해 주세요.', 2: '현재 위치를 찾을 수 없어요. GPS·Wi-Fi를 켠 뒤 다시 시도해 주세요.', 3: '위치 확인 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.' };
  document.querySelector('#location-message').textContent = messages[error?.code] || '현재 위치를 확인하지 못했어요.';
}

function showCurrentLocation(position) {
  clearTimeout(locationTimeout);
  userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
  if (userMarker) userMarker.setLatLng(userLocation);
  else userMarker = L.circleMarker(userLocation, { radius: 10, color: '#fff', weight: 3, fillColor: '#1769e0', fillOpacity: 1 }).addTo(map).bindPopup('<strong>현재 위치</strong>');
  map.flyTo(userLocation, 14, { duration: 0.6 });
  userMarker.openPopup();
  document.querySelector('#location-message').textContent = '현재 위치를 표시했어요. 카드의 거리는 직선거리입니다.';
  updateDistances();
}

function requestCurrentLocation() {
  initializeMap();
  const message = document.querySelector('#location-message');
  if (!navigator.geolocation) { message.textContent = '이 브라우저에서는 현재 위치를 지원하지 않습니다.'; return; }
  message.textContent = '현재 위치를 확인하고 있어요…';
  clearTimeout(locationTimeout);
  locationTimeout = setTimeout(() => showLocationError({ code: 3 }), 15000);
  navigator.geolocation.getCurrentPosition(showCurrentLocation, showLocationError, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
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
document.querySelector('#location-button').addEventListener('click', requestCurrentLocation);
document.querySelector('#map-all-button').addEventListener('click', () => { initializeMap(); showAllPlaces(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
