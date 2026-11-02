---
name: proton-portproton-troubleshooter
description: Официальное руководство по диагностике и решению проблем с запуском игр в Steam Proton и PortProton (расположение префиксов, логирование, настройки совместимости в Steam, зависимости Winetricks, pkexec).
---

# Диагностика и запуск игр: Steam Proton и PortProton

Руководство для Koda по устранению неполадок при запуске Windows-игр на SteamOS, составленное строго по официальной документации Valve (Proton) и Castro-Fidel (PortProton).

> [!IMPORTANT]
> **ПРАВИЛО ПРИВИЛЕГИЙ ROOT:**
> Любые команды, требующие прав суперпользователя (root/sudo), ОБЯЗАТЕЛЬНО выполнять через `pkexec <команда>` вместо `sudo <команда>`, чтобы пользователю выводилось графическое окно ввода пароля.

---

## 1. PortProton (согласно официальной документации Castro-Fidel/PortWINE)

### 1.1 Расположение префиксов WINE
В PortProton игры и их окружение изолируются в префиксах. Никогда не предполагайте произвольных путей — стандартные расположения:
* **Нативная установка:**
  `~/PortProton/prefixes/`
  * Префикс по умолчанию: `~/PortProton/prefixes/DEFAULT/`
  * Файловая система Windows: `~/PortProton/prefixes/DEFAULT/drive_c/`
  * Документы и сохранения: `drive_c/users/steamuser/` (или имя пользователя)
* **Flatpak-установка (`ru.linux_gaming.PortProton`):**
  `~/.var/app/ru.linux_gaming.PortProton/data/PortProton/prefixes/`

### 1.2 Сбор и анализ логов
Если игра не запускается или вылетает:
1. **Основной лог PortProton:**
   * Нативная версия: `~/PortProton/PortProton.log`
   * Flatpak-версия: `~/.var/app/ru.linux_gaming.PortProton/data/PortProton/PortProton.log`
2. **Диагностический запуск через терминал:**
   ```bash
   portproton "/путь/к/файлу.exe"
   ```
   *(для Flatpak: `flatpak run ru.linux_gaming.PortProton "/путь/к/файлу.exe"`)*
   Все ошибки инициализации Vulkan, подсистемы DXVK/VKD3D и отсутствующие DLL выводятся в терминал в реальном времени.

### 1.3 Критическое правило добавления ярлыков в Steam (Game Mode)
При добавлении игры из PortProton в библиотеку Steam в качестве сторонней игры:
* **В свойствах ярлыка в Steam вкладка «Совместимость» (Compatibility) ДОЛЖНА БЫТЬ ОТКЛЮЧЕНА!**
  * Флажок *«Принудительно использовать определенный инструмент совместимости Steam Play»* должен быть **снят**.
  * *Причина:* PortProton сам является нативным Linux-лаунчером и управляет версиями Wine/Proton. Если включить Proton в свойствах Steam, Steam попытается запустить Linux-скрипт PortProton внутри контейнера Proton, что приведёт к моментальному сбою при запуске.

### 1.4 Права доступа к внешним дискам и MicroSD (для Flatpak)
Если игра установлена на карту памяти (`/run/media/`), Flatpak по умолчанию может не иметь к ней доступа:
```bash
flatpak override --user --filesystem=/run/media ru.linux_gaming.PortProton
```

### 1.5 Управление библиотеками (Winetricks)
Для доустановки необходимых компонентов (Visual C++, DirectX, .NET) используйте штатный интерфейс PortProton:
* Открыть PortProton -> Настройки WINE -> вкладка Winetricks.

---

## 2. Игры в Steam (согласно официальной документации Valve Proton)

### 2.1 Логирование запуска (PROTON_LOG)
1. В свойствах игры в Steam в поле **Параметры запуска** (Launch Options) прописать:
   ```text
   PROTON_LOG=1 %command%
   ```
2. Запустить игру. Лог запишется в домашний каталог:
   `~/steam-<appid>.log`
3. Типовые маркеры в логе:
   * `dxvk::DxvkError` / `vkd3d` — сбои графического пайплайна или несовместимость версии драйвера/Vulkan.
   * `unimplemented function` — в текущей версии Proton отсутствует необходимый системный вызов Windows (решение: переключить на Proton Experimental или GE-Proton).

### 2.2 Префиксы Proton (Compatdata)
* Расположение префикса игры:
  `~/.local/share/Steam/steamapps/compatdata/<appid>/`
* **Сброс префикса при сбое:**
  Удаление каталога `pfx` внутри соответствующего appid приведёт к его автоматическому чистому пересозданию при следующем запуске:
  ```bash
  rm -rf ~/.local/share/Steam/steamapps/compatdata/<appid>/pfx
  ```
  *(Перед сбросом убедитесь, что сохранения синхронизированы со Steam Cloud).*

### 2.3 Кэш шейдеров (Shadercache)
Если игра вылетает при компиляции шейдеров:
```bash
rm -rf ~/.local/share/Steam/steamapps/shadercache/<appid>
```

---

## 3. Общепринятые флаги запуска в Steam

| Параметр | Описание |
|---|---|
| `PROTON_NO_ESYNC=1 %command%` | Отключение eventfd-синхронизации при зависаниях потоков |
| `PROTON_NO_FSYNC=1 %command%` | Отключение futex-синхронизации для старых движков |
| `DXVK_ASYNC=1 %command%` | Включение асинхронной компиляции DXVK (если поддерживается сборкой GE-Proton) |
| `RADV_PERFTEST=gpl %command%` | Использование Graphics Pipeline Library в драйвере RADV |
| `LD_PRELOAD="" %command%` | Отключение перехвата оверлеев при конфликтах библиотек |
