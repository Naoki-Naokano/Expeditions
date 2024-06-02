const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Настройка соединения с базой данных
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'game_db'
});

db.connect(err => {
  if (err) {
    console.error('Ошибка подключения к MySQL:', err);
    return;
  }
  console.log('Подключение к MySQL успешно установлено');
});

// Middleware для раздачи статических файлов
app.use(express.static('public'));

const socketUserMap = {};

// Обработка событий Socket.io
io.on('connection', (socket) => {
  console.log('Новый клиент подключен');

  socket.on('register', (data) => {
    const { username, password, location } = data;

    const userInsertQuery = 'INSERT INTO users (username, password, location) VALUES (?, ?, ?)';
    const resourcesInsertQuery = 'INSERT INTO resources (user_id, type, amount, update_rate) VALUES (?, ?, ?, ?)';

    // Вставка нового пользователя
    db.query(userInsertQuery, [username, password, location], (err, result) => {
      if (err) {
        // Проверяем, является ли ошибка ошибкой нарушения ограничения уникальности
        if (err.code === 'ER_DUP_ENTRY') {
          // Если ошибка вызвана дублированием записи, отправляем сообщение о существующем пользователе
          socket.emit('registerResponse', { success: false, message: 'Имя пользователя уже существует' });
        } else {
          // В противном случае отправляем обычное сообщение об ошибке
          socket.emit('registerResponse', { success: false, message: 'Ошибка регистрации' });
        }
        return;
      }

      // Получение ID только что созданного пользователя
      const newUserId = result.insertId;

      // Вставка начальных ресурсов для нового пользователя
      const initialResources = [
        { type: 'gold', amount: 100, update_rate: 1 },
        { type: 'wood', amount: 0, update_rate: 0 },
        { type: 'stone', amount: 0, update_rate: 0 },
        { type: 'clay', amount: 0, update_rate: 0 }
      ];

      initialResources.forEach(resource => {
        db.query(resourcesInsertQuery, [newUserId, resource.type, resource.amount, resource.update_rate], (err, result) => {
          if (err) {
            socket.emit('registerResponse', { success: false, message: 'Ошибка регистрации' });
            return;
          }
        });
      });

      // Отправка ответа о успешной регистрации
      socket.emit('registerResponse', { success: true, message: 'Регистрация успешна' });
    });
  });

  // Обработчик авторизации
  socket.on('login', (data) => {
    const { username, password } = data;

    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';

    db.query(query, [username, password], (err, results) => {
      if (err) {
        socket.emit('loginResponse', { success: false, message: 'Ошибка авторизации' });
        return;
      }
      if (results.length > 0) {
        const user = results[0];
        userInQuestion = user.id;

        // Получение ресурсов пользователя
        const resourcesQuery = 'SELECT * FROM resources WHERE user_id = ?';
        db.query(resourcesQuery, [user.id], (err, resourceResults) => {
          if (err) {
            socket.emit('loginResponse', { success: false, message: 'Ошибка авторизации' });
            return;
          }
          // Отправка данных о пользователе и его ресурсах

          socket.emit('loginResponse', {
            success: true,
            message: 'Авторизация успешна',
            user: {
              id: user.id,
            }
          });
        });
      } else {
        socket.emit('loginResponse', { success: false, message: 'Неверные имя пользователя или пароль' });
      }
    });
  });

  socket.on('pageLoaded', (data) => {
    const userId = data.userId;

    socketUserMap[socket.id] = userId;
    console.log(socketUserMap);
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключен');
    // При отключении пользователя удаляем его из списка пользователей в сети
    delete socketUserMap[socket.id];
  });
});

// Периодическое обновление ресурсов
setInterval(() => {
  // Получение всех пользователей
  const onlineUserIds = Object.values(socketUserMap);

  onlineUserIds.forEach(userId => {
    // Получение ресурсов пользователя
    const resourcesQuery = 'SELECT * FROM resources WHERE user_id = ?';
    db.query(resourcesQuery, [userId], (err, resources) => {
      if (err) {
        console.error('Ошибка получения ресурсов:', err);
        return;
      }

      // Обновление ресурсов для данного пользователя на основе коэффициентов прироста
      resources.forEach(resource => {
        const updateResourcesQuery = 'UPDATE resources SET amount = amount + ? WHERE user_id = ? AND type = ?';

        db.query(updateResourcesQuery, [resource.update_rate, userId, resource.type], (err, result) => {
          if (err) {
            console.error(`Ошибка обновления ресурса ${resource.type} для пользователя ${userId}:`, err);
            return;
          }
        });
      });
    });
  });

  // Получение обновленных ресурсов для всех пользователей
  const allResourcesQuery = 'SELECT * FROM resources';
  db.query(allResourcesQuery, (err, allResources) => {
    if (err) {
      console.error('Ошибка получения ресурсов:', err);
      return;
    }

    // Отправка обновленных ресурсов всем подключенным клиентам
    io.emit('resourceUpdate', allResources);
  });
}, 5000); // Обновление каждые 5 секунд

// Функция для получения количества ресурсов из результатов запроса
function getResourceAmount(results, type) {
  const resource = results.find(result => result.type === type);
  return resource ? resource.amount : 0;
}

// Запуск сервера
server.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
