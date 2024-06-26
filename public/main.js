document.addEventListener('DOMContentLoaded', function() {
  const socket = io();
  
  // Получаем данные пользователя из localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  let currentTradeOffer = null;  // Переменная для хранения текущего предложения
  let attackSquad = [];
  
  socket.emit('pageLoaded', { userId: currentUser.id });
  socket.emit('requestCreatures', {userId: currentUser.id});
  socket.on('preRequestCreatures', () => {
    socket.emit('requestCreatures', {userId: currentUser.id});
  });

  // Обрабатываем обновления ресурсов
  socket.on('resourceUpdate', (allResources) => {
    const userResources = allResources.filter(resource => resource.user_id === currentUser.id);
    userResources.forEach(resource => {
      if (resource.type === 'gold') {
        document.getElementById('goldAmount').innerText = Math.round(resource.amount);
        document.getElementById('goldAmountExp').innerText = Math.round(resource.amount);
        if (resource.amount >= 100){
          goldAmountExp.classList.add('green');
          goldAmountExp.classList.remove('red');
        } else {
          goldAmountExp.classList.add('red');
          goldAmountExp.classList.remove('green');
        }
      } else if (resource.type === 'wood') {
        document.getElementById('woodAmount').innerText = Math.round(resource.amount);
        document.getElementById('woodAmountExp').innerText = Math.round(resource.amount);
        if (resource.amount >= 20){
          woodAmountExp.classList.add('green');
          woodAmountExp.classList.remove('red');
        } else {
          woodAmountExp.classList.add('red');
          woodAmountExp.classList.remove('green');
        }
      } else if (resource.type === 'stone') {
        document.getElementById('stoneAmount').innerText = Math.round(resource.amount);
        document.getElementById('stoneAmountExp').innerText = Math.round(resource.amount);
        if (resource.amount >= 20){
          stoneAmountExp.classList.add('green');
          stoneAmountExp.classList.remove('red');
        } else {
          stoneAmountExp.classList.add('red');
          stoneAmountExp.classList.remove('green');
        }
      } else if (resource.type === 'clay') {
        document.getElementById('clayAmount').innerText = Math.round(resource.amount);
        document.getElementById('clayAmountExp').innerText = Math.round(resource.amount);
        if (resource.amount >= 20){
          clayAmountExp.classList.add('green');
          clayAmountExp.classList.remove('red');
        } else {
          clayAmountExp.classList.add('red');
          clayAmountExp.classList.remove('green');
        }
      } else if (resource.type === 'food') {
        document.getElementById('foodAmount').innerText = Math.round(resource.amount);
      }
    });
  });

  // Обработка кнопки "торговать и не только"
  const tradeModal = document.getElementById('tradeModal');
  const tradeWindow = document.getElementById('tradeWindow');
  const expeditionModal = document.getElementById('expeditionModal');
  const attackWindow = document.getElementById('attackWindow');
  
  const tradeBtn = document.getElementById('tradeBtn');
  const expeditionBtn = document.getElementById('expeditionBtn');
  const attackBtn = document.getElementById('attackBtn');
  
  const tradeModalClose = tradeModal.querySelector('.close');
  const tradeWindowClose = tradeWindow.querySelector('.close');
  const tradeExpeditionClose = expeditionModal.querySelector('.close');
  const attackWindowClose = attackWindow.querySelector('.close');

  tradeBtn.onclick = function() {
    tradeModal.style.display = 'block';
    // Запросить список активных пользователей
    socket.emit('getActiveUsers', { userId: currentUser.id, purpose: "trade" });
  }
  
  attackBtn.onclick = function() {
    tradeModal.style.display = 'block';
    // Запросить список активных пользователей
    attackCount = 0;
    attackSquad = [];
    socket.emit('getUsers', { userId: currentUser.id});
  }

  expeditionBtn.onclick = function() {
    expeditionModal.style.display = 'block';
  }

  window.onclick = function(event) {
    if (event.target == tradeModal) {
      tradeModal.style.display = 'none';
    } else if (event.target == tradeWindow) {
      tradeWindow.style.display = 'none';
    } else if (event.target == expeditionModal) {
      expeditionModal.style.display = 'none';
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
  
  socket.on('users', (users) => {
    const activeUsersList = document.getElementById('activeUsersList');
    activeUsersList.innerHTML = ''; // Очистка списка
    users.forEach(user => {
      const button = document.createElement('button');
      button.className = 'trade-user-button'; // Добавляем класс к кнопке
      button.innerText = `${user.username} | ${user.location}`;
      button.onclick = () => {
        // Логика выбора пользователя для атаки
        tradeModal.style.display = 'none';
        attackWindow.style.display = 'block';
        document.getElementById('selectedUserA').innerText = user.username;
        const attackListDiv = document.getElementById('availableCreatures');
        attackListDiv.innerHTML = '';
        socket.emit('getAvailableCreatures', {userId: currentUser.id});
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
  
  //Обработка отправки экспедиции
  document.getElementById('sendExp').addEventListener('click', () => {
    const goldAmount = document.getElementById('goldAmount').innerText;
    const woodAmount = document.getElementById('woodAmount').innerText;
    const stoneAmount = document.getElementById('stoneAmount').innerText;
    const clayAmount = document.getElementById('clayAmount').innerText;
    const selectedUser = currentUser.name;
    if (goldAmount>=100 && woodAmount>=20 && stoneAmount>=20 && clayAmount>=20){
      socket.emit('sendExpedition', {selectedUser});
      expeditionModal.style.display = 'none';
    }
  });

  // Закрытие модального окна
  document.querySelectorAll('.close').forEach(span => {
    span.onclick = function() {
      tradeModal.style.display = 'none';
      tradeWindow.style.display = 'none';
      tradeOfferModal.style.display = 'none';
      expeditionModal.style.display = 'none';
      attackWindow.style.display = 'none';
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
    tradeOfferModal.style.display = 'none';
  });
  
  document.getElementById('confirmAttack').addEventListener('click', () => {
    const selectedUser = document.getElementById('selectedUserA').innerText;
    if (attackSquad.length > 0){
      socket.emit('confirmAttack', {selectedUser, attackSquad});
      attackWindow.style.display = 'none';
    }
  });

  window.onclick = function(event) {
    if (event.target === tradeOfferModal) {
      tradeOfferModal.style.display = 'none';
    }
  };
  
  socket.on('getCreature', (data) => {
    const creatureListDiv = document.getElementById('creatureList');
    creatureListDiv.innerHTML = '';
    data.forEach((creature) => {
      const { name, rarity, amount, max_saturation, saturation, id, userId, power } = creature;

      // Создаем элемент <p> для отображения имени и редкости существа
      const creatureElement = document.createElement('p');
      const creatureSaturation = document.createElement('p');
      const calcPower = power / max_saturation * saturation;
      creatureElement.textContent = `${name} (${amount}), ${rarity} | Сила: ${Math.round(calcPower)}`;
      creatureElement.classList.add('resource');
      
      creatureSaturation.textContent = `${max_saturation*amount} / ${Math.round(saturation)}`;
      creatureSaturation.classList.add('resource');
      creatureSaturation.classList.add('saturation');
      const progressBar = document.createElement('progress');
      progressBar.value = saturation; // Текущее значение насыщенности
      progressBar.max = max_saturation * amount; // Максимальная насыщенность
      creatureSaturation.appendChild(progressBar);
      
      const button = document.createElement('button');
      button.textContent = 'Кормить';
      button.classList.add('feedBtn');
      button.onclick = () => {
        socket.emit('feedCreature',{ id, amount, max_saturation, saturation, userId });
      };
      creatureSaturation.appendChild(button);

      switch (rarity) {
        case "common":
          creatureElement.classList.add('common');
          break;
        case "uncommon":
          creatureElement.classList.add('uncommon');
          break;
        case "rare":
          creatureElement.classList.add('rare');
          break;
        case "mythic":
          creatureElement.classList.add('mythic');
          break;
        case "legendary":
          creatureElement.classList.add('legendary');
          break;
        default:
          // В случае, если редкость не соответствует ни одному из вариантов, не добавляем никакой класс
          break;
      }
      if (max_saturation*amount / 3 >= saturation){
         creatureSaturation.classList.add('red');
      }
      // Добавляем элемент <p> с информацией о существе в <div id="creatureList">
      creatureListDiv.appendChild(creatureElement);
      creatureListDiv.appendChild(creatureSaturation);
    });
  });
  socket.on('noCreature', (data) => {
    const creatureListDiv = document.getElementById('creatureList');
    creatureListDiv.innerHTML = '';
  });
  
  let attackCount = 0;
  socket.on('AvailableCreatures', (creature) => {
    const attackListDiv = document.getElementById('availableCreatures');
    const { name, rarity, amount, power, id } = creature;
    const attackElement = document.createElement('button');
    attackElement.textContent = `${name} (${amount}), ${rarity} | Сила: ${Math.round(power)}`;
    attackElement.classList.add('creatureBtn');
    attackElement.style.backgroundColor = 'white';
    attackElement.onclick = () => {
      if (attackElement.style.backgroundColor == 'white' && attackCount < 4){
        attackElement.style.backgroundColor = 'black';
        attackCount = attackCount + 1;
        attackSquad.push(id);
      } else if (attackElement.style.backgroundColor == 'black'){
        attackElement.style.backgroundColor = 'white';
        attackCount = attackCount - 1;
        attackSquad = attackSquad.filter(item => item !== id);
      }
    };
    
    switch (rarity) {
        case "common":
          attackElement.classList.add('common');
          break;
        case "uncommon":
          attackElement.classList.add('uncommon');
          break;
        case "rare":
          attackElement.classList.add('rare');
          break;
        case "mythic":
          attackElement.classList.add('mythic');
          break;
        case "legendary":
          attackElement.classList.add('legendary');
          break;
        default:
          // В случае, если редкость не соответствует ни одному из вариантов, не добавляем никакой класс
          break;
      }
    attackListDiv.appendChild(attackElement);
  });
  
  socket.on('win', () => {
    alert("ПОБЕДА!!!");
  });
  socket.on('lose', () => {
    alert("не повезло :(");
  });
  
});
