import Modal from "./Modal";
import HTTPService from "./HTTPService";
import WebSocketService from "./WebSocketService";

export default class Chat {
  constructor(container) {
    this.container = container;
    this.nickname = null;
    this.userId = null;

    // Инициализация сервисов
    this.httpService = new HTTPService("http://localhost:3000");
    this.wsService = new WebSocketService("ws://localhost:3000");

    // Обработка закрытия страницы
    window.addEventListener("beforeunload", () => {
      this.exitChat();
    });
  }

  init() {
    this.showNicknameModal();
  }

  showNicknameModal() {
    const modal = new Modal("Выберите псевдоним", "Введите ваш никнейм");

    modal.onSubmit = async (nickname) => {
      try {
        // Регистрируем пользователя через HTTPService
        const result = await this.httpService.registerUser(nickname);

        if (result.status === "error") {
          const hint = modal.modal.querySelector(".form__hint");
          hint.textContent = result.message || "Ошибка регистрации";

          const input = modal.modal.querySelector(".modal__input");
          input.value = "";
          input.focus();
          return;
        }

        this.nickname = nickname;
        this.userId = result.user.id;
        modal.hide();

        this.bindToDOM();
        this.registerEvents();
        await this.subscribeOnEvents();
      } catch (error) {
        console.error("Ошибка при регистрации:", error);
        const hint = modal.modal.querySelector(".form__hint");
        hint.textContent = "Ошибка подключения. Попробуйте снова.";
      }
    };

    modal.render();
    modal.show();
  }

  bindToDOM() {
    const html = `
          <div class="container">
            <h1 class="chat__header">Чат</h1>
            <div class="chat__container">
              <div class="chat__area">
                <div class="chat__messages-container" id="messagesContainer"></div>
                <div class="chat__messages-input">
                  <form class="form" id="messageForm">
                    <div class="form__group">
                      <input 
                        type="text" 
                        class="form__input" 
                        id="messageInput"
                        placeholder="Введите сообщение..."
                      />
                    </div>
                  </form>
                </div>
              </div>
              <div class="chat__userlist" id="userList"></div>
            </div>
          </div>
        `;

    this.container.innerHTML = html;
  }

  registerEvents() {
    const form = document.getElementById("messageForm");
    const input = document.getElementById("messageInput");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sendMessage(input.value);
      input.value = "";
      input.focus();
    });
  }

  async subscribeOnEvents() {
    // Регистрируем обработчики WebSocket
    this.wsService.onMessage((data) => this.handleMessage(data));
    this.wsService.onConnect(() => console.log("Подключено к чату"));
    this.wsService.onDisconnect(() => console.log("Отключено от чата"));
    this.wsService.onError((error) =>
      console.error("Ошибка WebSocket:", error)
    );

    // Подключаемся к WebSocket
    await this.wsService.connect();
  }

  handleMessage(data) {
    // Обновление списка пользователей (объект с type)
    if (data && data.type === "users") {
      this.renderUsers(data.users);
      return;
    }

    // Обновление списка пользователей (массив, для совместимости)
    if (Array.isArray(data)) {
      this.renderUsers(data);
      return;
    }

    // Новое сообщение
    if (data && data.type === "send") {
      this.renderMessage(data);
    }
  }

  sendMessage(text) {
    if (!text.trim() || !this.wsService.isConnected()) return;

    const message = {
      type: "send",
      message: text,
      user: {
        id: this.userId,
        name: this.nickname,
      },
    };

    this.wsService.send(message);
  }

  renderMessage(data) {
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    const messageDiv = document.createElement("div");

    const isOwn = data.user.id === this.userId;
    const className = isOwn
      ? "message__container message__container-yourself"
      : "message__container message__container-interlocutor";

    messageDiv.className = className;
    messageDiv.innerHTML = `
          <div class="message__header">
            ${isOwn ? "You" : data.user.name}, ${this.formatDate(new Date())}
          </div>
          <div class="message__text">${this.escapeHtml(data.message)}</div>
        `;

    container.append(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  renderUsers(users) {
    const userList = document.getElementById("userList");
    if (!userList) return;

    userList.innerHTML = "";

    users.forEach((user) => {
      const userDiv = document.createElement("div");
      userDiv.className = "chat__user";

      const isYou = user.id === this.userId;
      const displayName = isYou ? "You" : user.name;
      const style = isYou ? "color: #20b1df;" : "";

      userDiv.innerHTML = `<span style="${style}">${displayName}</span>`;
      userList.append(userDiv);
    });
  }

  formatDate(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${hours}:${minutes} ${day}.${month}.${year}`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  exitChat() {
    if (this.wsService.isConnected()) {
      this.wsService.send({
        type: "exit",
        user: {
          id: this.userId,
          name: this.nickname,
        },
      });
      this.wsService.disconnect();
    }
  }
}