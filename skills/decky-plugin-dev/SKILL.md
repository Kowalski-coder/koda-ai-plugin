---
name: decky-plugin-dev
description: Разработка и отладка плагинов для Decky Loader на SteamOS / Steam Deck (Frontend React/@decky/ui, Backend Python main.py, modern API, runner-скрипты, системные права pkexec).
---

# Разработка плагинов Decky Loader для Steam Deck

Руководство по созданию, отладке и интеграции плагинов для **Decky Loader** на SteamOS (Steam Deck).

> [!IMPORTANT]
> **Привилегии и выполнение команд:**
> Если для выполнения задач требуются права суперпользователя (root/sudo), ВСЕГДА используйте `pkexec <команда>` вместо `sudo <команда>`, чтобы пользователю отображалось графическое окно ввода пароля.

---

## 1. Архитектура и структура файлов плагина

Стандартная структура плагина Decky Loader:

```
<PluginName>/
├── plugin.json             # Манифест плагина (name, author, version, flags, api_version)
├── main.py                 # Бэкенд плагина (Python 3, выполняется PluginLoader)
├── package.json            # Зависимости фронтенда (React, decky-frontend-lib)
├── rollup.config.js        # Сборщик фронтенда Rollup
├── tsconfig.json           # Конфигурация TypeScript
├── src/
│   └── index.tsx           # Исходный код интерфейса (QAM вкладка)
├── dist/
│   └── index.js            # Собранный бандл фронтенда
└── assets/                 # Иконки и статические ресурсы
```

---

## 2. Манифест (`plugin.json`)

```json
{
  "name": "My Plugin",
  "author": "Author",
  "flags": ["root"],
  "api_version": 1,
  "version": "1.0.0",
  "main": "dist/index.js"
}
```

- `"flags": ["root"]` — запускает бэкенд от имени суперпользователя (root).
- `"api_version": 1` — современный стандарт Decky Loader v3 (не использовать legacy методы).

---

## 3. Бэкенд (`main.py`)

1. Бэкенд должен объявлять класс `Plugin` с методами жизненного цикла `_main(self)` и `_unload(self)`.
2. Экспортируемые RPC-методы должны принимать `*args, **kwargs`.
3. Для операций от имени обычного пользователя (`deck` / текущий пользователь системы) используйте `os.setuid` / `os.setgid` (demote) или `sudo -u <user>`.

```python
import asyncio
import os
from pathlib import Path

class Plugin:
    async def _main(self):
        pass

    async def _unload(self):
        pass

    async def get_status(self, *args, **kwargs):
        return {"status": "ok"}
```

---

## 4. Фронтенд (`src/index.tsx`) и вызовы RPC

Для совместимости с Decky v3 вызывайте методы через `window.DeckyBackend.call`:

```tsx
async function callPlugin(serverApi: any, method: string, ...args: any[]) {
  const backend = (window as any).DeckyBackend;
  if (backend?.call) {
    return await backend.call("loader/call_plugin_method", "My Plugin", method, ...args);
  }
  return await serverApi.callPluginMethod(method, args[0] || {});
}
```

---

## 5. Запуск сторонних приложений из Game Mode

Chromium / Electron приложения в Game Mode конфликтуют со Steam Overlay (`gameoverlayrenderer.so`), что приводит к аварийному завершению GPU (`error_code=1002`).

**Решение:**
1. Создавать скрипт-обертку (`runner.sh`):
   ```bash
   #!/usr/bin/env bash
   unset LD_PRELOAD
   exec "/path/to/app.AppImage" --no-sandbox "$@"
   ```
2. Регистрировать ярлык Steam на этот `runner.sh`.
3. Задавать `StartupWMClass` в `.desktop`-файле соответствующим реальному `WM_CLASS` окна для правильного захвата Gamescope.
