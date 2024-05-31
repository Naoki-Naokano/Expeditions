const socket = io();

// Получаем данные пользователя из localStorage
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

socket.emit('pageLoaded', { userId: currentUser.id });

// Обрабатываем обновления ресурсов
socket.on('resourceUpdate', (allResources) => {
  const userResources = allResources.filter(resource => resource.user_id === currentUser.id);
  userResources.forEach(resource => {
    if (resource.type === 'gold') {
      document.getElementById('goldAmount').innerText = resource.amount;
    } else if (resource.type === 'wood') {
      document.getElementById('woodAmount').innerText = resource.amount;
    } else if (resource.type === 'stone') {
      document.getElementById('stoneAmount').innerText = resource.amount;
    } else if (resource.type === 'clay') {
      document.getElementById('clayAmount').innerText = resource.amount;
    }
  });
});
