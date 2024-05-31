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

// Простой маршрут для проверки работы сервера
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Обработка событий Socket.io
io.on('connection', (socket) => {
  console.log('Новый клиент подключен');

  socket.on('register', (data) => {
    const { username, password, location } = data;

    const userInsertQuery = 'INSERT INTO users (username, password, location) VALUES (?, ?, ?)';
    const resourcesInsertQuery = 'INSERT INTO resources (user_id, type, amount) VALUES (?, ?, ?)';

    // Вставка нового пользователя
    db.query(userInsertQuery, [username, password, location], (err, result) => {
      if (err) {
        socket.emit('registerResponse', { success: false, message: 'Ошибка регистрации' });
        return;
      }
      
      // Получение ID только что созданного пользователя
      const userId = result.insertId;

      // Вставка начальных ресурсов для нового пользователя
      const initialResources = [
        { type: 'gold', amount: 100 },
        { type: 'wood', amount: 0 },
        { type: 'stone', amount: 0 },
        { type: 'clay', amount: 0 }
      ];

      initialResources.forEach(resource => {
        db.query(resourcesInsertQuery, [userId, resource.type, resource.amount], (err, result) => {
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

  // Периодическое обновление ресурсов
  setInterval(async () => {
    // Здесь можно добавить логику обновления ресурсов пользователя, если это необходимо.
    // Например, увеличивать количество ресурсов на определённую величину
    // или обновлять их из базы данных.

    // Пример обновления ресурсов каждого пользователя (упрощённый вариант):
    /*const updateResourcesQuery = 'UPDATE resources SET amount = amount + 1 WHERE type = ?';
    const resourceTypes = ['gold', 'wood', 'stone', 'clay'];

    resourceTypes.forEach(type => {
      db.query(updateResourcesQuery, [type], (err, result) => {
        if (err) {
          console.error('Ошибка обновления ресурсов:', err);
          return;
        }
      });
    });*/

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

  socket.on('disconnect', () => {
    console.log('Клиент отключен');
  });
});

// Функция для получения количества ресурсов из результатов запроса
function getResourceAmount(results, type) {
  const resource = results.find(result => result.type === type);
  return resource ? resource.amount : 0;
}

// Запуск сервера
server.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
