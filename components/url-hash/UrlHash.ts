export class UrlHash {
  static write(params: any): void {
    window.location.hash = Object.keys(params)
      .map((key: string) => {
        const value = params[key];
        if (Array.isArray(value)) {
          return value.map(v => `${key}=${v}`).join("&");
        }
        else {
          return `${key}=${params[key]}`
        }
      })
      .join("&");
  }

  static read(): any {
    const params = {};

    window.location.hash
      .substr(1)
      .split("&")
      .forEach((param) => {
        const [key, value] = param.split("=");

        if (key) {
          let existingValue = params[key];
          if (existingValue) {
            if (!Array.isArray(existingValue)) {
              existingValue = [existingValue];
              params[key] = existingValue;
            }
            existingValue.push(value);
          }
          else {
            params[key] = value;
          }
        }
      });

    return params;
  }
}