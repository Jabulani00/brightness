export interface Environment {
    production: boolean;
    apiUrl: string;
  }
  
  declare global {
    interface ImportMeta {
      env: Environment;
    }
  }
  