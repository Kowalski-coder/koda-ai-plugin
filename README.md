# Koda AI — Decky Loader Plugin

<p align="center">
  <img src="assets/koda-app.png" alt="Koda AI Logo" width="128" />
</p>

<p align="center">
  <b>Плагин Decky Loader для Steam Deck</b><br>
  Управление, запуск и интеграция десктопного клиента <b>Kodacode</b> в Game Mode и Desktop Mode со встроенными скиллами для SteamOS.
</p>

---

## Возможности

- 🚀 **Установка и запуск в один клик:** Загрузка актуального AppImage Koda Desktop, интеграция в меню приложений KDE и библиотека Steam (Game Mode).
- 🎮 **Поддержка Game Mode:** Автоматическое создание ярлыка в `shortcuts.vdf` с фирменной иконкой и запуск прямо из оверлея Decky QAM.
- 📊 **Мониторинг квот и лимитов:** Отображение текущего тарифа (Free / Pro) и полос оставшихся вызовов моделей (`Koda base`, `Koda PRO`) с корректным временем сброса по местному часовому поясу.
- 🧩 **Встроенные скиллы для SteamOS:**
  - **SteamOS Core:** системное администрирование, диагностика служб systemd, Flatpak, Game Mode / Desktop Mode.
  - **Proton & PortProton Troubleshooter:** префиксы Wine/Proton, диагностика игр, запуск Windows-приложений.
  - **KDE Plasma Deck:** конфигурация рабочего стола, энергосбережение, сочетания клавиш.
  - **Decky Plugin Dev:** документация и инструментарий для разработки плагинов под Steam Deck.
- 🎨 **Нативный интерфейс Decky:** Монохромная иконка боковой панели QAM, плавный прогресс-бар установки и диалог подтверждения удаления.

---

## Установка

1. Перейдите в раздел [Releases](https://github.com/Kowalski-coder/koda-ai-plugin/releases) и скачайте актуальный архив **`Koda AI.zip`**.
2. Распакуйте архив в директорию плагинов Decky Loader:
   ```bash
   unzip "Koda AI.zip" -d ~/homebrew/plugins/
   ```
3. Перезагрузите Decky Loader или выполните перезагрузку устройства:
   ```bash
   sudo systemctl restart plugin_loader
   ```
4. Откройте Quick Access Menu (кнопка `...`), перейдите на вкладку плагинов Decky — плагин **Koda AI** готов к работе!

---

## Структура проекта

```text
├── assets/          # Иконки и логотипы Kodacode
├── dist/            # Собранный бандл фронтенда (index.js)
├── skills/          # Встроенные скиллы для Koda Desktop
│   ├── steamos/
│   ├── proton-portproton-troubleshooter/
│   ├── kde-plasma-deck/
│   └── decky-plugin-dev/
├── src/             # Исходный код фронтенда React / TypeScript
│   └── index.tsx
├── main.py          # Бэкенд плагина (Python / Decky Loader API)
├── package.json     # Конфигурация зависимостей и сборки
├── plugin.json      # Манифест плагина Decky Loader
└── rollup.config.js # Конфигурация сборщика Rollup
```

---

## Разработка

Для сборки фронтенда из исходников:

```bash
# Установка зависимостей
npm install

# Сборка плагина
npm run build
```

---

## Лицензия

Распространяется под лицензией BSD 3-Clause / MIT.
Автор: **Kowalski**
