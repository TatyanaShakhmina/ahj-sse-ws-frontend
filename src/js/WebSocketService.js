export default class WebSocketService {
  constructor(url = "ws://localhost:3000") {
    this.url = url;
    this.websocket = null;
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.disconnectionHandlers = [];
    this.errorHandlers = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.url);

        this.websocket.addEventListener("open", () => {
          console.log("WebSocket подключен");
          this.connectionHandlers.forEach((handler) => handler());
          resolve();
        });

        this.websocket.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            this.messageHandlers.forEach((handler) => handler(data));
          } catch (error) {
            console.error("Ошибка при парсинге сообщения:", error);
          }
        });

        this.websocket.addEventListener("close", () => {
          console.log("WebSocket закрыт");
          this.disconnectionHandlers.forEach((handler) => handler());
        });

        this.websocket.addEventListener("error", (error) => {
          console.error("WebSocket ошибка:", error);
          this.errorHandlers.forEach((handler) => handler(error));
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  onConnect(handler) {
    this.connectionHandlers.push(handler);
  }

  onDisconnect(handler) {
    this.disconnectionHandlers.push(handler);
  }

  onError(handler) {
    this.errorHandlers.push(handler);
  }

  send(data) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    } else {
      console.error("WebSocket не подключен");
    }
  }

  disconnect() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.close();
    }
  }

  isConnected() {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }
}