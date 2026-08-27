export class ApiClient {
  async get(path: string) {
    return fetch(path).then(res => res.json());
  }
}
