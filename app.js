const tripStart = new Date('2026-08-23T04:00:00+09:00');
const countdown = document.querySelector('#countdown');

function updateCountdown() {
  const diff = tripStart - new Date();
  if (diff <= 0) { countdown.textContent = '제주 여행 일정'; return; }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  countdown.textContent = `출발까지 ${days}일 ${hours}시간`;
}
updateCountdown();

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((item) => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-selected', item === button); });
    document.querySelectorAll('.panel').forEach((panel) => { const active = panel.id === button.dataset.tab; panel.classList.toggle('is-active', active); panel.hidden = !active; });
  });
});

document.querySelectorAll('.day-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.day-button').forEach((item) => item.classList.toggle('is-active', item === button));
    document.querySelectorAll('[data-timeline]').forEach((timeline) => timeline.classList.toggle('is-hidden', timeline.dataset.timeline !== button.dataset.day));
  });
});

document.querySelector('#location-button').addEventListener('click', () => {
  const message = document.querySelector('#location-message');
  if (!navigator.geolocation) { message.textContent = '이 브라우저에서는 현재 위치를 지원하지 않습니다.'; return; }
  message.textContent = '현재 위치를 확인하고 있어요…';
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => { message.textContent = `현재 위치 확인 완료 (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}) · 맛집 좌표 추가 시 거리 순으로 볼 수 있어요.`; },
    () => { message.textContent = '위치 권한이 필요합니다. 브라우저 설정에서 위치 접근을 허용해 주세요.'; },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
