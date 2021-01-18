export class UrlHash {
    static write(params: any): void {
        window.location.hash = Object.keys(params)
           .map((key: string) => `${key}=${params[key]}`)
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
            params[key] = value;
          }
        });

        return params;
    }
}