export type DialogKind = 'alert' | 'confirm' | 'prompt';

export interface DialogRequest {
  requestId: string;
  kind: DialogKind;
  message: string;
  defaultValue?: string;
  origin: string;
}

export interface DialogResponse {
  confirmed: boolean;
  value?: string;
}

export interface BasicAuthRequest {
  requestId: string;
  host: string;
  port: number;
  realm: string;
  isProxy: boolean;
  scheme: string;
  url: string;
}

export interface BasicAuthCreds {
  username: string;
  password: string;
}
