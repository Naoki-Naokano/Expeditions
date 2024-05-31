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
    db.query(resourcesInsertQuery, [userId, 'gold', 100], (err, result) => {
      if (err) {
        socket.emit('registerResponse', { success: false, message: 'Ошибка регистрации' });
        return;
      }
      // Дополнительные операции по желанию
    });

    db.query(resourcesInsertQuery, [userId, 'wood', 0], (err, result) => {
      if (err) {
        socket.emit('registerResponse', { success: false, message: 'Ошибка регистрации' });
        return;
      }
      // Дополнительные операции по желанию
    });

    db.query(resourcesInsertQuery, [userId, 'stone', 0], (err, result) => {
      if (err) {
        socket.emit('registerResponse', { success: false, message: 'Ошибка регистрации' });
        return;
      }
      // Дополнительные операции по желанию
    });

    db.query(resourcesInsertQuery, [userId, 'clay', 0], (err, result) => {
      if (err) {
        socket.emit('registerResponse', { success: false, message: 'Ошибка регистрации' });
        return;
      }
      // Дополнительные операции по желанию
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
            username: user.username,
            location: user.location,
            resources: {
              gold: getResourceAmount(resourceResults, 'gold'),
              wood: getResourceAmount(resourceResults, 'wood'),
              stone: getResourceAmount(resourceResults, 'stone'),
              clay: getResourceAmount(resourceResults, 'clay')
            }
          }
        });
      });
    } else {
      socket.emit('loginResponse', { success: false, message: 'Неверные имя пользователя или пароль' });
    }
  });
});

// Функция для получения количества ресурсов из результатов запроса
function getResourceAmount(results, type) {
  const resource = results.find(result => result.type === type);
  return resource ? resource.amount : 0;
}

  socket.on('disconnect', () => {
    console.log('Клиент отключен');
  });
});

// Запуск сервера
server.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
