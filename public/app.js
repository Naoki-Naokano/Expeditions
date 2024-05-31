const socket = io();

document.getElementById('registerForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.getElementById('registerUsername').value;
  const password = document.getElementById('registerPassword').value;
  const location = document.getElementById('registerLocation').value;
  
  socket.emit('register', { username, password, location });
});

socket.on('registerResponse', (response) => {
  const messageElement = document.getElementById('registerMessage');
  if (response.success) {
    messageElement.style.color = 'green';
  } else {
    messageElement.style.color = 'red';
  }
  messageElement.innerText = response.message;
});

document.getElementById('loginForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  socket.emit('login', { username, password });
});

socket.on('loginResponse', (response) => {
  const messageElement = document.getElementById('loginMessage');
  if (response.success) {
    messageElement.style.color = 'green';
    messageElement.innerText = response.message;
    const user = response.user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    // Перенаправление на страницу main.html
    window.location.href = '/main.html';
  } else {
    messageElement.style.color = 'red';
    messageElement.innerText = response.message;
  }
});
