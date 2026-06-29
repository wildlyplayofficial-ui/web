/** Telegram Mini App WebApp interface — subset of properties we use. */

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebAppInitDataUnsafe {
  user?: TelegramWebAppUser;
  start_param?: string;
  auth_date?: number;
  hash?: string;
}

interface TelegramMainButton {
  text: string;
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  setText(text: string): void;
  enable(): void;
  disable(): void;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitDataUnsafe;
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  MainButton: TelegramMainButton;
  ready(): void;
  expand(): void;
  close(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  switchInlineQuery(query: string, chatTypes?: string[]): void;
}

/** Telegram Games API proxy — available in Games webview (not Mini App). */
interface TelegramGameProxy {
  shareScore(): void;
  postEvent(eventType: string, eventData?: unknown): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
    TelegramGameProxy?: TelegramGameProxy;
  }
}

export {};
