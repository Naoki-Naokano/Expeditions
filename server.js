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
        { type: 'clay', amount: 0, update_rate: 0 },
        { type: 'food', amount: 0, update_rate: 1 }
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
      //socket.emit('registerResponse', { success: true, message: 'Регистрация успешна' });
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
              name: user.username,
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
  });
  
  
  socket.on('getActiveUsers', (data) => {
  const userId = data.userId; //Получаем пользователя, который хочет торговать
  const activeUserIds = Object.values(socketUserMap).filter(id => id !== userId); // Получаем массив идентификаторов активных пользователей
  const query = 'SELECT id, username, location FROM users WHERE id IN (?)'; // Запрос к базе данных для получения информации о пользователях по их идентификаторам
  if (activeUserIds.length > 0){
    db.query(query, [activeUserIds], (err, results) => {
      if (err) {
        console.error('Ошибка при запросе к базе данных:', err);
        return;
      }
      const activeUsers = results.map(row => ({
        id: row.id,
        username: row.username,
        location: row.location
      }));
      socket.emit('activeUsers', activeUsers); // Отправляем список активных пользователей клиенту
    });
  };
});

  socket.on('confirmTrade', (data) => {
    const user = data.selectedUser;
    io.emit('tradeOffer', {user, data});
  });
  
  socket.on('tradeAccept', (tradeData) => {
  const { sale, sale_quantity, purchase, purchase_quantity, selectedUser, requesterName } = tradeData;
  console.log(tradeData);
  // Получаем user_id для обоих пользователей
  const getUsersQuery = 'SELECT id, username FROM users WHERE username IN (?, ?)';
  db.query(getUsersQuery, [requesterName, selectedUser], (err, results) => {
    if (err) {
      console.error('Error fetching user IDs:', err);
      return;
    }

    const requester = results.find(user => user.username === requesterName);
    const recipient = results.find(user => user.username === selectedUser);

    if (!requester || !recipient) {
      console.error('User not found');
      return;
    }

    // Обновляем ресурсы
    db.beginTransaction(err => {
      if (err) throw err;

      const updateResourceQuery = `
        UPDATE resources 
        SET amount = CASE 
          WHEN user_id = ? AND type = ? THEN amount - ?
          WHEN user_id = ? AND type = ? THEN amount + ?
          WHEN user_id = ? AND type = ? THEN amount - ?
          WHEN user_id = ? AND type = ? THEN amount + ?
        END
        WHERE 
          (user_id = ? AND type = ?) OR 
          (user_id = ? AND type = ?) OR 
          (user_id = ? AND type = ?) OR 
          (user_id = ? AND type = ?)
      `;

      db.query(updateResourceQuery, [
        requester.id, sale, sale_quantity,          // Отнять у requester sale_quantity type sale
        recipient.id, sale, sale_quantity,          // Добавить recipient sale_quantity type sale
        recipient.id, purchase, purchase_quantity,  // Добавить recipient purchase_quantity type purchase
        requester.id, purchase, purchase_quantity,  // Отнять у requester purchase_quantity type purchase

        // Условия WHERE
        requester.id, sale,
        recipient.id, sale,
        recipient.id, purchase,
        requester.id, purchase
      ], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error updating resources:', err);
          });
        }

        // Выполнить новый запрос для проверки значений полей
        const checkFieldsQuery = `
          SELECT amount 
          FROM resources 
          WHERE (user_id = ? AND type = ?) OR (user_id = ? AND type = ?) OR (user_id = ? AND type = ?) OR (user_id = ? AND type = ?)
        `;

        db.query(checkFieldsQuery, [
          requester.id, sale,
          recipient.id, sale,
          recipient.id, purchase,
          requester.id, purchase
        ], (err, rows) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error checking resource amounts:', err);
            });
          }

          let abortTransaction = false;
          for (let row of rows) {
            if (row.amount < 0) {
              abortTransaction = true;
              break;
            }
          }

          if (abortTransaction) {
            return db.rollback(() => {
              console.error('Transaction aborted: one of the amounts is less than 0.');
            });
          }

          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                console.error('Error committing transaction:', err);
              });
            }
            console.log('Transaction Completed Successfully.');
          });
        });
      });
    });
    ``
  });
});

  // Обработка события 'sendExpedition'
socket.on('sendExpedition', (data) => {
  const {selectedUser} = data;

  db.beginTransaction((err) => {

    // Запрос для получения user_id по username
    const getUserIdQuery = 'SELECT id FROM users WHERE username = ?';
    
    db.query(getUserIdQuery, [selectedUser], (err, results) => {
      if (err) {
        return db.rollback(() => {
          console.error('Ошибка выполнения запроса для получения user_id:', err);
        });
      }

      if (results.length === 0) {
        return db.rollback(() => {
          console.error('Пользователь не найден');
        });
      }

      const userId = results[0].id;

      // Запрос для обновления ресурсов пользователя
      const updateResourcesQuery = `
        UPDATE resources
        SET amount = CASE 
          WHEN type = 'gold' THEN amount - ?
          WHEN type = 'wood' THEN amount - ?
          WHEN type = 'stone' THEN amount - ?
          WHEN type = 'clay' THEN amount - ?
        END
        WHERE user_id = ? AND type IN ('gold', 'wood', 'stone', 'clay')
      `;

      db.query(updateResourcesQuery, [100, 20, 20, 20, userId], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error('Ошибка обновления ресурсов:', err);
          });
        }

        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Ошибка фиксации транзакции:', err);
            });
          }

          console.log('Транзакция успешно завершена.');
        });
      });
    
  
      const creatureId = getRandomInt(1, 18);
 //////////////////////////////////////////
 const query = 'SELECT * FROM creature_list WHERE id = ?';
  
  db.query(query, [creatureId], (err, results) => {
    if (err) {
      console.error('Ошибка выполнения запроса:', err);
      return;
    }
    // Проверка наличия результатов
    if (results.length > 0) {
      console.log('Данные существа:', results[0]);
    } else {
      console.log('Существо с указанным id не найдено.');
    }
  });
 ////////////////////////////////////////////////////// 
  
    
      const selectQuery = 'SELECT * FROM creatures WHERE user_id = ? AND creature_id = ?';
      db.query(selectQuery, [userId, creatureId], (err, results) => {
        if (err) {
          console.error('Ошибка выполнения запроса SELECT:', err);
          return;
        }
        
        if (results.length > 0) {
          // Если запись уже существует, увеличиваем amount на 1
          const updateQuery = 'UPDATE creatures SET amount = amount + 1 WHERE user_id = ? AND creature_id = ?';
          db.query(updateQuery, [userId, creatureId], (err, result) => {
            if (err) {
              console.error('Ошибка выполнения запроса UPDATE:', err);
              return;
            }
            console.log('Запись обновлена.');
          });
        } else {
          // Если запись не существует, создаем новую запись
          const insertQuery = 'INSERT INTO creatures (user_id, creature_id, amount) VALUES (?, ?, 1)';
          db.query(insertQuery, [userId, creatureId], (err, result) => {
            if (err) {
              console.error('Ошибка выполнения запроса INSERT:', err);
              return;
            }
            console.log('Новая запись добавлена.');
          });
        }
      });
    });
  });
  socket.emit('preRequestCreatures');
});

socket.on('requestCreatures', (data) => {
    
    const userId = data.userId;
  // Запрос для получения всех записей creatures для заданного userId
  const getCreaturesQuery = 'SELECT creature_id, amount FROM creatures WHERE user_id = ?';

  db.query(getCreaturesQuery, [userId], (err, creatures) => {
    if (err) {
      console.error('Ошибка выполнения запроса для получения creatures:', err);
      return;
    }
    if (creatures.length > 0) {
    // Переменная для хранения идентификаторов существ
    let creatureIds = creatures.map(creature => creature.creature_id);
    // Запрос для получения name и rarity для каждого creature_id из таблицы creature_list
    const getCreatureDetailsQuery = 'SELECT id, name, rarity FROM creature_list WHERE id IN (?)';

    db.query(getCreatureDetailsQuery, [creatureIds], (err, creatureDetails) => {
      if (err) {
        console.error('Ошибка выполнения запроса для получения деталей существ:', err);
        return;
      }

      // Создаем объект для хранения данных о существах { amount, name, rarity }
      let creatureData = [];

      // Для каждой записи creatures
      creatures.forEach(creature => {
        // Находим соответствующие данные о существе из creatureDetails
        let details = creatureDetails.find(detail => detail.id === creature.creature_id);

        // Если данные о существе найдены
        if (details) {
          // Добавляем данные в объект creatureData
          creatureData.push({
            amount: creature.amount,
            name: details.name,
            rarity: details.rarity
          });
        }
      });
      // Отправляем данные через сокет
      socket.emit('getCreature', creatureData);
    });
    }
  });    
});

  socket.on('disconnect', () => {
    console.log('Клиент отключен');
    // При отключении пользователя удаляем его из списка пользователей в сети
    delete socketUserMap[socket.id];
  });
});

// Периодическое обновление ресурсов
setInterval(() => {
  io.emit('preRequestCreatures');
  // Получение всех пользователей
  const onlineUserIds = Object.values(socketUserMap);

  onlineUserIds.forEach(userId => {
    //io.emit('requestCreatures', {userId});
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
}, 1000); // Обновление каждые 1 секунд

// Функция для получения количества ресурсов из результатов запроса
function getResourceAmount(results, type) {
  const resource = results.find(result => result.type === type);
  return resource ? resource.amount : 0;
}

// Запуск сервера
server.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});

function getRandomInt(min, max) {
  // Получить случайное число в диапазоне от min до max включительно
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
