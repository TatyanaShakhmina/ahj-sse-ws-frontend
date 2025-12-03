export default class HTTPService {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  async registerUser(nickname) {
    const response = await fetch(`${this.baseUrl}/new-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nickname }),
    });

    return response.json();
  }
}
