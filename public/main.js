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
  const tradeModal = document.getElementById('tradeModal');
  const tradeWindow = document.getElementById('tradeWindow');
  const tradeBtn = document.getElementById('tradeBtn');
  const tradeModalClose = tradeModal.querySelector('.close');
  const tradeWindowClose = tradeWindow.querySelector('.close');

  tradeBtn.onclick = function() {
    tradeModal.style.display = 'block';
    // Запросить список активных пользователей
    socket.emit('getActiveUsers', { userId: currentUser.id });
  }

  tradeModalClose.onclick = function() {
    tradeModal.style.display = 'none';
  }

  tradeWindowClose.onclick = function() {
    tradeWindow.style.display = 'none';
  }

  window.onclick = function(event) {
    if (event.target == tradeModal) {
      tradeModal.style.display = 'none';
    } else if (event.target == tradeWindow) {
      tradeWindow.style.display = 'none';
    }
  }

  // Обработка списка активных пользователей
  socket.on('activeUsers', (users) => {
    const activeUsersList = document.getElementById('activeUsersList');
    activeUsersList.innerHTML = ''; // Очистка списка
    users.forEach(user => {
      const button = document.createElement('button');
      button.className = 'trade-user-button'; // Добавляем класс к кнопке
      button.innerText = `${user.username} | ${user.location}`;
      button.onclick = () => {
        // Логика выбора пользователя для торговли
        console.log(`Вы выбрали пользователя ${user.username}`);
        tradeModal.style.display = 'none';
        tradeWindow.style.display = 'block';
        document.getElementById('selectedUser').innerText = user.username;
      };
      activeUsersList.appendChild(button);
    });
  });
  
  // Обработка события подтверждения сделки
  document.getElementById('confirmTrade').addEventListener('click', () => {
    const sale = document.getElementById('sale').value;
    const sale_qunatity = document.getElementById('sale_quantity').value;
    const purchase = document.getElementById('purchase').value;
    const purchase_qunatity = document.getElementById('purchase_quantity').value;
    const selectedUser = document.getElementById('selectedUser').innerText;
    
    // Отправить данные на сервер для обработки сделки
    socket.emit('confirmTrade', {sale, sale_qunatity, purchase, purchase_qunatity, selectedUser});
    tradeWindow.style.display = 'none';
  });
  
  socket.on('tradeOffer', (data) => {
    if (data.user == currentUser.name) {
      console.log("Вам запрос торговли!");
      console.log(data.data);
    };
  });

});