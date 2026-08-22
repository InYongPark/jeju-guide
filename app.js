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
];

let map;
let mapStarted = false;
let userMarker;
let locationTimeout;

function updateCountdown() {
  const diff = tripStart - new Date();
  if (diff <= 0) { countdown.textContent = '제주 여행 일정'; return; }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  countdown.textContent = `출발까지 ${days}일 ${hours}시간`;
}

function kakaoSearchUrl(name) { return `https://map.kakao.com/link/search/${encodeURIComponent(`${name} 제주`)}`; }

function renderRestaurantCards() {
  document.querySelector('#food-list').innerHTML = restaurants.map(([name, category, note]) => `
    <article class="place-card">
      <p class="place-category">${category}</p>
      <h3>${name}</h3>
      <p>${note}</p>
      <a href="${kakaoSearchUrl(name)}" target="_blank" rel="noreferrer">카카오맵에서 위치 보기 ↗</a>
    </article>`).join('');
}

function initializeMap() {
  if (mapStarted) { setTimeout(() => map.invalidateSize(), 0); return; }
  mapStarted = true;
  const status = document.querySelector('#map-status');
  if (!window.L) {
    status.innerHTML = '<strong>지도를 불러오지 못했어요</strong><p>네트워크 연결 후 새로고침해 주세요.</p>';
    return;
  }
  map = L.map('food-map', { zoomControl: false }).setView(jejuCenter, 10);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  setTimeout(() => status.classList.add('is-hidden'), 400);
}

function showLocationError(error) {
  clearTimeout(locationTimeout);
  const messages = {
    1: '위치 권한이 꺼져 있어요. 주소창 왼쪽 설정에서 위치를 허용해 주세요.',
    2: '현재 위치를 찾을 수 없어요. GPS·Wi-Fi를 켠 뒤 다시 시도해 주세요.',
    3: '위치 확인 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.',
  };
  document.querySelector('#location-message').textContent = messages[error?.code] || '현재 위치를 확인하지 못했어요. 위치 권한을 확인해 주세요.';
}

function showCurrentLocation(position) {
  clearTimeout(locationTimeout);
  const location = [position.coords.latitude, position.coords.longitude];
  if (userMarker) userMarker.setLatLng(location);
  else userMarker = L.marker(location, { title: '현재 위치' }).addTo(map).bindPopup('<strong>현재 위치</strong>');
  map.flyTo(location, 14, { duration: 0.7 });
  userMarker.openPopup();
  document.querySelector('#location-message').textContent = '현재 위치를 지도에 표시했어요.';
}

function requestCurrentLocation() {
  initializeMap();
  const message = document.querySelector('#location-message');
  if (!navigator.geolocation) { message.textContent = '이 브라우저에서는 현재 위치를 지원하지 않습니다.'; return; }
  message.textContent = '현재 위치를 확인하고 있어요…';
  clearTimeout(locationTimeout);
  locationTimeout = setTimeout(() => showLocationError({ code: 3 }), 15000);
  navigator.geolocation.getCurrentPosition(showCurrentLocation, showLocationError, {
    enableHighAccuracy: false,
    timeout: 12000,
    maximumAge: 300000,
  });
}

updateCountdown();
renderRestaurantCards();

document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-tab]').forEach((item) => {
    item.classList.toggle('is-active', item === button);
    item.setAttribute('aria-selected', item === button);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    const active = panel.id === button.dataset.tab;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
  if (button.dataset.tab === 'food') initializeMap();
}));

document.querySelectorAll('.day-button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.day-button').forEach((item) => item.classList.toggle('is-active', item === button));
  document.querySelectorAll('[data-timeline]').forEach((timeline) => timeline.classList.toggle('is-hidden', timeline.dataset.timeline !== button.dataset.day));
}));

document.querySelector('#location-button').addEventListener('click', requestCurrentLocation);
document.querySelector('#map-all-button').addEventListener('click', () => {
  initializeMap();
  map.flyTo(jejuCenter, 10, { duration: 0.6 });
});
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
