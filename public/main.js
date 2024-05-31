// Получаем данные пользователя из localStorage
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// Обновляем интерфейс на основе данных пользователя
if (currentUser) {
  document.getElementById('goldAmount').innerText = currentUser.resources.gold;
  document.getElementById('woodAmount').innerText = currentUser.resources.wood;
  document.getElementById('stoneAmount').innerText = currentUser.resources.stone;
  document.getElementById('clayAmount').innerText = currentUser.resources.clay;
}
