document.addEventListener('DOMContentLoaded', function() {
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

  // Обработка кнопки "торговать"
  const modal = document.getElementById('tradeModal');
  const btn = document.getElementById('tradeBtn');
  const span = document.getElementsByClassName('close')[0];

  btn.onclick = function() {
    modal.style.display = 'block';
    // Запросить список активных пользователей
    socket.emit('getActiveUsers', { userId: currentUser.id });
  }

  span.onclick = function() {
    modal.style.display = 'none';
  }

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  }

  // Обработка списка активных пользователей
  socket.on('activeUsers', (users) => {
    const activeUsersList = document.getElementById('activeUsersList');
    activeUsersList.innerHTML = ''; // Очистка списка
    users.forEach(user => {
      const button = document.createElement('button');
      button.className = 'trade-user-button'; // Добавляем класс к кнопке
      button.innerText = user.username;
      button.onclick = () => {
        // Логика выбора пользователя для торговли
        console.log(`Вы выбрали пользователя ${user.username}`);
        modal.style.display = 'none';
        // Добавьте здесь логику для начала торговли с выбранным пользователем
      };
      activeUsersList.appendChild(button);
    });
  });
});
