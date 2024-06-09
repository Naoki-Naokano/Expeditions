document.addEventListener('DOMContentLoaded', function() {
  const socket = io();
  
  // Получаем данные пользователя из localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  let currentTradeOffer = null;  // Переменная для хранения текущего предложения
  
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
    const sale_quantity = document.getElementById('sale_quantity').value;
    const purchase = document.getElementById('purchase').value;
    const purchase_quantity = document.getElementById('purchase_quantity').value;
    const selectedUser = document.getElementById('selectedUser').innerText;
    const requesterName = currentUser.name;
    
    // Отправить данные на сервер для обработки сделки
    socket.emit('confirmTrade', {sale, sale_quantity, purchase, purchase_quantity, selectedUser, requesterName});
    tradeWindow.style.display = 'none';
  });
  
  // Обработка полученного торгового предложения
  socket.on('tradeOffer', (data) => {
    if (data.user === currentUser.name) {
      console.log(data.data);
      currentTradeOffer = data.data; // Сохранение текущего предложения
      
      tradeOfferDetails.innerText = `Запрос от ${data.data.requesterName}:
      Продать: ${data.data.purchase_quantity} ${data.data.purchase} за ${data.data.sale_quantity} ${data.data.sale}`;

      // Покажите модальное окно
      tradeOfferModal.style.display = 'block';
    };
  });

  // Закрытие модального окна
  document.querySelectorAll('.close').forEach(span => {
    span.onclick = function() {
      tradeModal.style.display = 'none';
      tradeWindow.style.display = 'none';
      tradeOfferModal.style.display = 'none';
    }
  });

  document.getElementById('acceptTrade').addEventListener('click', () => {
    // Логика принятия торгового предложения
    if (currentTradeOffer) {
      const { sale, sale_quantity, purchase, purchase_quantity, selectedUser, requesterName } = currentTradeOffer;
      socket.emit('tradeAccept', { sale, sale_quantity, purchase, purchase_quantity, selectedUser, requesterName });
      tradeOfferModal.style.display = 'none';
    }
  });

  document.getElementById('rejectTrade').addEventListener('click', () => {
    // Логика отклонения торгового предложения
    tradeOfferModal.style.display = 'none';
  });

  window.onclick = function(event) {
    if (event.target === tradeOfferModal) {
      tradeOfferModal.style.display = 'none';
    }
  };
});
