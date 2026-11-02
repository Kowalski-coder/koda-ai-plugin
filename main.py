import asyncio
import glob
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# Ensure system Python modules are accessible within Decky's PyInstaller sandbox
py_ver = f"{sys.version_info.major}.{sys.version_info.minor}"
for base in ["/usr/lib", "/usr/lib64"]:
    p = f"{base}/python{py_ver}"
    if os.path.isdir(p) and p not in sys.path:
        sys.path.append(p)
    site_p = f"{p}/site-packages"
    if os.path.isdir(site_p) and site_p not in sys.path:
        sys.path.append(site_p)

try:
    import decky
    logger = decky.logger
except ImportError:
    try:
        import decky_plugin as decky
        logger = decky.logger
    except ImportError:
        decky = None
        import logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger("KodaAIInstaller")

DOWNLOAD_URL = "https://download.kodacode.ru/download/Koda-Desktop-latest.AppImage"


def get_user_info():
    """Detects target Steam Deck unprivileged user and directories."""
    username = None
    if decky and hasattr(decky, "DECKY_USER") and decky.DECKY_USER:
        username = decky.DECKY_USER
    if not username:
        username = os.environ.get("DECKY_USER")
    if not username and decky and hasattr(decky, "DECKY_USER_HOME") and decky.DECKY_USER_HOME:
        username = Path(decky.DECKY_USER_HOME).name
    if not username:
        try:
            username = pwd.getpwuid(1000).pw_name
        except Exception:
            if os.path.isdir("/home/deck"):
                username = "deck"
            else:
                username = os.environ.get("USER", "deck")

    try:
        pw = pwd.getpwnam(username)
    except KeyError:
        pw = pwd.getpwuid(1000)
        username = pw.pw_name

    user_home = pw.pw_dir
    uid = pw.pw_uid
    gid = pw.pw_gid

    return {
        "username": username,
        "home": user_home,
        "uid": uid,
        "gid": gid
    }


def chown_path(path_str: str, uid: int, gid: int, recursive: bool = True):
    """Recursively set ownership to uid:gid."""
    p = Path(path_str)
    if not p.exists():
        return
    try:
        os.chown(p, uid, gid)
    except Exception as e:
        logger.warning(f"Failed to chown {p}: {e}")

    if recursive and p.is_dir():
        for child in p.rglob("*"):
            try:
                os.chown(child, uid, gid)
            except Exception:
                pass


def parse_version_tuple(v_str: str):
    """Converts a version string into a tuple of ints for comparison."""
    if not v_str:
        return (0,)
    parts = re.findall(r"\d+", v_str)
    if not parts:
        return (0,)
    return tuple(int(x) for x in parts)


def get_paths():
    user = get_user_info()
    home = Path(user["home"])
    apps_dir = home / "Applications"
    local_share = home / ".local" / "share"
    meta_dir = local_share / "koda-desktop"
    skills_dir = meta_dir / "skills"
    desktop_dir = home / "Desktop"
    menu_apps_dir = local_share / "applications"
    icons_dir = local_share / "icons" / "hicolor" / "256x256" / "apps"
    app_icons_dir = apps_dir / "icons"
    run_script = apps_dir / "koda-desktop-run.sh"

    plugin_dir = Path(__file__).resolve().parent
    plugin_skills_dir = plugin_dir / "skills"
    kodacli_dir = home / ".kodacli"
    kodacli_skills_dir = kodacli_dir / "skills"
    kodacli_memory_file = kodacli_dir / "KODA.md"
    creds_file = home / ".config" / "koda" / "credentials.json"

    return {
        "home": home,
        "apps_dir": apps_dir,
        "appimage": apps_dir / "Koda-Desktop.AppImage",
        "run_script": run_script,
        "meta_dir": meta_dir,
        "metadata_file": meta_dir / "metadata.json",
        "skills_dir": skills_dir,
        "plugin_skills_dir": plugin_skills_dir,
        "kodacli_dir": kodacli_dir,
        "kodacli_skills_dir": kodacli_skills_dir,
        "kodacli_memory_file": kodacli_memory_file,
        "creds_file": creds_file,
        "desktop_shortcut": desktop_dir / "koda-desktop.desktop",
        "menu_shortcut": menu_apps_dir / "koda-desktop.desktop",
        "icons_dir": icons_dir,
        "icon_file": icons_dir / "koda-app.png",
        "app_icon_file": app_icons_dir / "koda-app.png",
        "app_icons_dir": app_icons_dir,
        "desktop_dir": desktop_dir,
        "menu_apps_dir": menu_apps_dir
    }


class Plugin:
    user_info = get_user_info()
    operation_lock = asyncio.Lock()
    operation_state = {
        "running": False,
        "action": None,
        "progress": 0,
        "message": "",
        "error": None
    }
    limits_cache = None
    limits_cache_time = 0

    @property
    def paths(self):
        return get_paths()

    async def _main(self):
        Plugin.user_info = get_user_info()
        logger.info(f"Koda AI plugin started for user {Plugin.user_info['username']}")

    async def _unload(self):
        logger.info("Koda AI plugin unloaded")

    def _update_installed_apps_json(self, version: str):
        """Updates standard Decky .installed_apps.json catalog registry."""
        apps_json_path = self.paths["apps_dir"] / ".installed_apps.json"
        data = {}
        if apps_json_path.is_file():
            try:
                with open(apps_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception as e:
                logger.error(f"Error reading .installed_apps.json: {e}")

        data["koda_desktop"] = {
            "id": "koda_desktop",
            "name": "Koda Desktop",
            "shortcut_name": "Koda Desktop",
            "version": version,
            "executable": "Koda-Desktop.AppImage",
            "installed_path": str(self.paths["appimage"]),
            "install_dir": None,
            "is_archive": False,
            "add_to_steam": True,
            "installed_at": version
        }

        try:
            with open(apps_json_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            chown_path(str(apps_json_path), self.user_info["uid"], self.user_info["gid"], recursive=False)
        except Exception as e:
            logger.error(f"Error saving .installed_apps.json: {e}")

    def _remove_from_installed_apps_json(self):
        """Removes Koda Desktop from .installed_apps.json."""
        apps_json_path = self.paths["apps_dir"] / ".installed_apps.json"
        if not apps_json_path.is_file():
            return
        try:
            with open(apps_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "koda_desktop" in data:
                del data["koda_desktop"]
                with open(apps_json_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                chown_path(str(apps_json_path), self.user_info["uid"], self.user_info["gid"], recursive=False)
        except Exception as e:
            logger.error(f"Error removing from .installed_apps.json: {e}")

    def _read_metadata(self):
        meta_path = self.paths["metadata_file"]
        if meta_path.is_file():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading metadata: {e}")
        return None

    def _write_metadata(self, data: dict):
        p = self.paths
        p["meta_dir"].mkdir(parents=True, exist_ok=True)
        with open(p["metadata_file"], "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        chown_path(str(p["meta_dir"]), self.user_info["uid"], self.user_info["gid"])

    async def get_status(self, *args, **kwargs):
        """Returns installed status, current version, shortcut existence, and operation state."""
        p = self.paths
        appimage_exists = p["appimage"].is_file()
        meta = self._read_metadata() or {}

        installed_version = meta.get("version")
        if appimage_exists and not installed_version:
            installed_version = "установлено"

        limits = await asyncio.to_thread(self._sync_get_koda_limits)

        return {
            "installed": appimage_exists,
            "version": installed_version,
            "appimage_path": str(p["appimage"]),
            "apps_dir": str(p["apps_dir"]),
            "icon_path": str(p["icon_file"]),
            "desktop_shortcut": p["desktop_shortcut"].is_file(),
            "menu_shortcut": p["menu_shortcut"].is_file(),
            "limits": limits,
            "operation": self.operation_state
        }

    async def get_koda_limits(self, *args, **kwargs):
        """Fetches quota limits for Koda models (forced refresh)."""
        return await asyncio.to_thread(self._sync_get_koda_limits, force=True)

    async def check_remote_version(self, *args, **kwargs):
        """Quickly fetches headers to determine the remote version without downloading the file."""
        return await asyncio.to_thread(self._sync_check_remote_version)

    def _sync_check_remote_version(self):
        try:
            req = urllib.request.Request(
                DOWNLOAD_URL,
                headers={"User-Agent": "Mozilla/5.0 (Koda-Decky-Installer)"}
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                cd = response.headers.get("Content-Disposition", "")
                m = re.search(r"Koda-Desktop-([0-9.]+)\.AppImage", cd)
                remote_version = m.group(1) if m else "1.3.0"
                etag = response.headers.get("ETag", "").strip('"')
                content_length = int(response.headers.get("Content-Length", 0))

                meta = self._read_metadata() or {}
                local_version = meta.get("version")

                update_available = False
                if local_version:
                    update_available = parse_version_tuple(remote_version) > parse_version_tuple(local_version)

                return {
                    "success": True,
                    "remote_version": remote_version,
                    "local_version": local_version,
                    "update_available": update_available,
                    "etag": etag,
                    "size_bytes": content_length
                }
        except Exception as e:
            logger.error(f"Failed to check remote version: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def _ensure_icon(self):
        """Copies bundled icon to standard system icon locations."""
        p = self.paths
        uid = self.user_info["uid"]
        gid = self.user_info["gid"]

        plugin_dir = Path(__file__).resolve().parent
        bundled_icon = plugin_dir / "assets" / "koda-app.png"
        bundled_icon_512 = plugin_dir / "assets" / "koda-app-512.png"
        bundled_svg = plugin_dir / "assets" / "koda-mark.svg"

        icons_256 = p["icons_dir"]
        icons_512 = p["home"] / ".local" / "share" / "icons" / "hicolor" / "512x512" / "apps"
        icons_scalable = p["home"] / ".local" / "share" / "icons" / "hicolor" / "scalable" / "apps"

        icons_256.mkdir(parents=True, exist_ok=True)
        icons_512.mkdir(parents=True, exist_ok=True)
        icons_scalable.mkdir(parents=True, exist_ok=True)
        p["app_icons_dir"].mkdir(parents=True, exist_ok=True)

        if bundled_icon.is_file():
            shutil.copy2(bundled_icon, p["icon_file"])
            shutil.copy2(bundled_icon, p["app_icon_file"])
            if bundled_icon_512.is_file():
                shutil.copy2(bundled_icon_512, icons_512 / "koda-app.png")
            else:
                shutil.copy2(bundled_icon, icons_512 / "koda-app.png")
            if bundled_svg.is_file():
                shutil.copy2(bundled_svg, icons_scalable / "koda-app.svg")

        chown_path(str(p["icon_file"]), uid, gid)
        chown_path(str(p["app_icon_file"]), uid, gid)
        chown_path(str(icons_512 / "koda-app.png"), uid, gid)
        chown_path(str(icons_scalable / "koda-app.svg"), uid, gid)

    def _create_shortcuts(self):
        """Creates launcher script, desktop entry in application menu, and on Desktop (KDE Plasma)."""
        p = self.paths
        uid = self.user_info["uid"]
        gid = self.user_info["gid"]

        self._ensure_icon()

        p["menu_apps_dir"].mkdir(parents=True, exist_ok=True)
        p["desktop_dir"].mkdir(parents=True, exist_ok=True)

        # 1. Launcher runner script: strips Steam's gameoverlayrenderer.so, handles FUSE 2 fallback, and enables --no-sandbox
        runner_content = (
            "#!/usr/bin/env bash\n"
            "# Clear Steam LD_PRELOAD overlay hooks which crash Chromium GPU process\n"
            "unset LD_PRELOAD\n\n"
            f'APPIMAGE="{p["appimage"]}"\n'
            "EXTRA_ARGS=()\n"
            "# Fallback to extract-and-run if FUSE 2 (libfuse.so.2) is not installed\n"
            "if ! ldconfig -p 2>/dev/null | grep -q 'libfuse\\.so\\.2' && [ ! -f /usr/lib/libfuse.so.2 ] && [ ! -f /usr/lib64/libfuse.so.2 ]; then\n"
            "    EXTRA_ARGS+=(--appimage-extract-and-run)\n"
            "fi\n\n"
            'exec "$APPIMAGE" "${EXTRA_ARGS[@]}" --no-sandbox "$@"\n'
        )
        with open(p["run_script"], "w", encoding="utf-8") as f:
            f.write(runner_content)
        os.chmod(p["run_script"], 0o755)
        chown_path(str(p["run_script"]), uid, gid)

        desktop_entry = (
            "[Desktop Entry]\n"
            "Name=Koda Desktop\n"
            "Comment=Koda AI Desktop Client & Assistant\n"
            f'Exec="{p["run_script"]}" %U\n'
            f'Path={p["apps_dir"]}\n'
            "Icon=koda-app\n"
            "Terminal=false\n"
            "Type=Application\n"
            "StartupWMClass=koda-app\n"
            "Categories=Development;IDE;Utility;\n"
            "StartupNotify=true\n"
        )

        # 2. Application menu entry
        with open(p["menu_shortcut"], "w", encoding="utf-8") as f:
            f.write(desktop_entry)
        os.chmod(p["menu_shortcut"], 0o755)
        chown_path(str(p["menu_shortcut"]), uid, gid)

        # 3. KDE Plasma Desktop shortcut
        with open(p["desktop_shortcut"], "w", encoding="utf-8") as f:
            f.write(desktop_entry)
        os.chmod(p["desktop_shortcut"], 0o755)
        chown_path(str(p["desktop_shortcut"]), uid, gid)

        # Update desktop database
        try:
            subprocess.run(["update-desktop-database", str(p["menu_apps_dir"])], capture_output=True, timeout=5)
        except Exception:
            pass

    def _install_skills(self):
        """Installs bundled skills and global KODA.md pkexec instructions."""
        p = self.paths
        uid = self.user_info["uid"]
        gid = self.user_info["gid"]

        p["skills_dir"].mkdir(parents=True, exist_ok=True)
        p["kodacli_skills_dir"].mkdir(parents=True, exist_ok=True)

        plugin_skills = p["plugin_skills_dir"]
        if plugin_skills.is_dir():
            for skill_dir in plugin_skills.iterdir():
                if skill_dir.is_dir():
                    # 1. ~/.local/share/koda-desktop/skills/<skill>
                    dest1 = p["skills_dir"] / skill_dir.name
                    if dest1.exists():
                        shutil.rmtree(dest1, ignore_errors=True)
                    shutil.copytree(skill_dir, dest1)

                    # 2. ~/.kodacli/skills/<skill>
                    dest2 = p["kodacli_skills_dir"] / skill_dir.name
                    if dest2.exists():
                        shutil.rmtree(dest2, ignore_errors=True)
                    shutil.copytree(skill_dir, dest2)

        # 3. Add pkexec enforcement into ~/.kodacli/KODA.md
        pkexec_rule = (
            "## Koda Added Memories\n\n"
            "### Системные привилегии и выполнение команд\n"
            "- ВСЕГДА И БЕЗ ИСКЛЮЧЕНИЙ при выполнении любых команд в терминале, требующих прав суперпользователя (root/sudo), выполнять их исключительно через `pkexec <команда>` вместо `sudo <команда>`, чтобы пользователю выводилось графическое диалоговое окно для ввода пароля.\n"
            "- Пояснять пользователю свои действия и кратко описывать что делают те или иные выполняемые в настоящий момент команды.\n"
        )
        mem_file = p["kodacli_memory_file"]
        p["kodacli_dir"].mkdir(parents=True, exist_ok=True)
        if not mem_file.exists():
            with open(mem_file, "w", encoding="utf-8") as f:
                f.write(pkexec_rule)
        else:
            try:
                with open(mem_file, "r", encoding="utf-8") as f:
                    content = f.read()
                if "pkexec" not in content:
                    with open(mem_file, "a", encoding="utf-8") as f:
                        f.write("\n" + pkexec_rule)
            except Exception as e:
                logger.warning(f"Failed to check KODA.md: {e}")

        chown_path(str(p["skills_dir"]), uid, gid)
        chown_path(str(p["kodacli_dir"]), uid, gid)

    def _uninstall_skills(self):
        """Removes bundled skills installed by this plugin."""
        p = self.paths
        plugin_skills = p["plugin_skills_dir"]
        if plugin_skills.is_dir():
            for skill_dir in plugin_skills.iterdir():
                if skill_dir.is_dir():
                    s1 = p["skills_dir"] / skill_dir.name
                    if s1.is_dir():
                        shutil.rmtree(s1, ignore_errors=True)
                    s2 = p["kodacli_skills_dir"] / skill_dir.name
                    if s2.is_dir():
                        shutil.rmtree(s2, ignore_errors=True)

    def _sync_get_koda_limits(self, force: bool = False):
        """Fetches quota limits from Koda Auth API or credentials cache with caching."""
        if not force and Plugin.limits_cache and (time.time() - Plugin.limits_cache_time < 60):
            return Plugin.limits_cache

        p = self.paths
        creds_file = p["creds_file"]

        if not creds_file.exists():
            return {
                "ok": False,
                "authenticated": False,
                "message": "Вход в Koda Desktop ещё не выполнен"
            }

        try:
            with open(creds_file, "r", encoding="utf-8") as f:
                creds = json.load(f)
        except Exception as e:
            return {
                "ok": False,
                "authenticated": False,
                "error": f"Ошибка чтения credentials: {e}"
            }

        kauth = creds.get("kodaAuth", {})
        token = kauth.get("accessToken")
        expires_at = kauth.get("expiresAt")
        device_code = kauth.get("deviceCode")
        base = kauth.get("baseUrl", "https://auth.kodacode.ru").rstrip("/")
        user = kauth.get("user", {})
        tier = kauth.get("tier", "Free")

        username = user.get("label") or user.get("firstName") or user.get("email") or "Koda User"
        email = user.get("email", "")

        result = {
            "ok": True,
            "authenticated": bool(token),
            "user": username,
            "email": email,
            "tier": str(tier).capitalize(),
            "groups": []
        }

        if not token and not device_code:
            result["authenticated"] = False
            return result

        def is_token_expired(exp_str):
            if not exp_str:
                return False
            try:
                exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                now_utc = datetime.now(timezone.utc)
                return (exp_dt - now_utc).total_seconds() <= 120
            except Exception:
                return False

        def refresh_token():
            if not device_code:
                return None
            try:
                req = urllib.request.Request(
                    f"{base}/auth/device/token",
                    data=json.dumps({"deviceCode": device_code}).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "User-Agent": "Koda-Decky-Plugin"
                    }
                )
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    data = json.loads(resp.read().decode())
                    new_token = data.get("token") or data.get("accessToken")
                    if new_token:
                        kauth["accessToken"] = new_token
                        if data.get("expiresAt"):
                            kauth["expiresAt"] = data["expiresAt"]
                        if data.get("tier"):
                            kauth["tier"] = data["tier"]
                        try:
                            with open(creds_file, "w", encoding="utf-8") as f_out:
                                json.dump(creds, f_out, indent=2, ensure_ascii=False)
                            chown_path(str(creds_file), self.user_info["uid"], self.user_info["gid"], recursive=False)
                        except Exception:
                            pass
                        return new_token
            except Exception as e:
                logger.warning(f"Failed to refresh Koda token: {e}")
            return None

        if is_token_expired(expires_at) and device_code:
            t = refresh_token()
            if t:
                token = t

        data = None
        if token:
            try:
                req = urllib.request.Request(
                    f"{base}/account/limits",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "User-Agent": "Koda-Decky-Plugin"
                    }
                )
                with urllib.request.urlopen(req, timeout=5.0) as resp:
                    data = json.loads(resp.read().decode())
            except urllib.error.HTTPError as he:
                if he.code == 401 and device_code:
                    new_t = refresh_token()
                    if new_t:
                        token = new_t
                        try:
                            req = urllib.request.Request(
                                f"{base}/account/limits",
                                headers={
                                    "Authorization": f"Bearer {token}",
                                    "User-Agent": "Koda-Decky-Plugin"
                                }
                            )
                            with urllib.request.urlopen(req, timeout=5.0) as resp:
                                data = json.loads(resp.read().decode())
                        except Exception:
                            pass
            except Exception as e:
                logger.warning(f"Failed to fetch live limits: {e}")

        def format_reset_time(iso_str):
            if not iso_str:
                return ""
            try:
                # Kodacode API sends UTC timestamps without timezone offset
                clean_str = iso_str.replace("Z", "+00:00")
                dt = datetime.fromisoformat(clean_str)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                local_dt = dt.astimezone()
                now = datetime.now().astimezone()
                diff_days = (local_dt.date() - now.date()).days
                if diff_days == 0:
                    return f"Сегодня в {local_dt.strftime('%H:%M')}"
                elif diff_days == 1:
                    return f"Завтра в {local_dt.strftime('%H:%M')}"
                else:
                    months_ru = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
                    m_name = months_ru[local_dt.month - 1] if 1 <= local_dt.month <= 12 else str(local_dt.month)
                    return f"{local_dt.day} {m_name} {local_dt.strftime('%H:%M')}"
            except Exception:
                return iso_str[:16].replace("T", " ")

        def format_mg_name(mg):
            low = mg.lower()
            if "base" in low:
                return "Koda base"
            elif "pro" in low:
                return "Koda PRO"
            elif "other" in low or "external" in low:
                return "Сторонние модели"
            return mg.replace("-", " ").title()

        if data and isinstance(data, dict) and "limits" in data:
            lims = data.get("limits", {})
            sub = lims.get("active_subscription") or lims.get("paid_tier") or lims.get("base_tier") or tier
            result["tier"] = str(sub).capitalize()

            raw_pools = []
            if isinstance(lims.get("base_usage"), list):
                raw_pools.extend(lims["base_usage"])
            if isinstance(lims.get("paid_usage"), list):
                raw_pools.extend(lims["paid_usage"])
            if isinstance(lims.get("business_usage"), list):
                raw_pools.extend(lims["business_usage"])

            seen = set()
            groups = []
            for item in raw_pools:
                mg = item.get("model_group", "")
                cur = float(item.get("current_calls", 0))
                m = float(item.get("max_calls", 0))
                period = item.get("period", "")
                next_ref = item.get("next_refresh", "")

                key = (mg, period)
                if key in seen:
                    continue
                seen.add(key)
                if m <= 0 and cur <= 0:
                    continue

                rem = max(0.0, m - cur)
                pct = (cur / m) if m > 0 else 0.0
                period_ru = "в день" if period == "daily" else ("в месяц" if period == "monthly" else period)

                groups.append({
                    "name": format_mg_name(mg),
                    "model_group": mg,
                    "used": round(cur, 1),
                    "max": round(m, 1),
                    "remaining": round(rem, 1),
                    "percent": round(pct, 3),
                    "period": period,
                    "period_label": period_ru,
                    "reset_text": format_reset_time(next_ref)
                })

            extra_balance = float(lims.get("balance", 0))
            if extra_balance > 0:
                groups.append({
                    "name": "Доп. баланс",
                    "model_group": "balance",
                    "used": 0.0,
                    "max": extra_balance,
                    "remaining": extra_balance,
                    "percent": 1.0,
                    "period": "balance",
                    "period_label": "баланс",
                    "reset_text": ""
                })
            result["groups"] = groups

        # Fallback to credentials.json if live query failed
        if not result["groups"] and "limits" in kauth and "usageEntries" in kauth["limits"]:
            for entry in kauth["limits"].get("usageEntries", []):
                mg = entry.get("modelGroup", "")
                cur = float(entry.get("current", 0))
                m = float(entry.get("max", 0))
                rem = float(entry.get("remaining", max(0.0, m - cur)))
                period = entry.get("period", "")
                next_ref = entry.get("nextRefreshAt", "")
                period_ru = "в день" if period == "daily" else ("в месяц" if period == "monthly" else period)
                pct = (cur / m) if m > 0 else 0.0

                result["groups"].append({
                    "name": format_mg_name(mg),
                    "model_group": mg,
                    "used": round(cur, 1),
                    "max": round(m, 1),
                    "remaining": round(rem, 1),
                    "percent": round(pct, 3),
                    "period": period,
                    "period_label": period_ru,
                    "reset_text": format_reset_time(next_ref)
                })

        Plugin.limits_cache = result
        Plugin.limits_cache_time = time.time()
        return result

    def _sync_download_and_install(self, expected_version: str = None):
        """Downloads the AppImage with progress reporting and writes shortcuts."""
        p = self.paths
        uid = self.user_info["uid"]
        gid = self.user_info["gid"]

        p["apps_dir"].mkdir(parents=True, exist_ok=True)
        p["meta_dir"].mkdir(parents=True, exist_ok=True)
        p["skills_dir"].mkdir(parents=True, exist_ok=True)

        tmp_appimage = p["apps_dir"] / ".Koda-Desktop.AppImage.download"
        if tmp_appimage.exists():
            tmp_appimage.unlink()

        self.operation_state.update({
            "running": True,
            "progress": 5,
            "message": "Подключение к серверу загрузки...",
            "error": None
        })

        req = urllib.request.Request(
            DOWNLOAD_URL,
            headers={"User-Agent": "Mozilla/5.0 (Koda-Decky-Installer)"}
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            cd = resp.headers.get("Content-Disposition", "")
            m = re.search(r"Koda-Desktop-([0-9.]+)\.AppImage", cd)
            detected_version = m.group(1) if m else (expected_version or "1.3.0")
            total_size = int(resp.headers.get("Content-Length", 0))

            downloaded = 0
            block_size = 1024 * 512  # 512 KB chunks

            self.operation_state.update({
                "progress": 10,
                "message": f"Загрузка Koda Desktop v{detected_version}..."
            })

            with open(tmp_appimage, "wb") as out_f:
                while True:
                    chunk = resp.read(block_size)
                    if not chunk:
                        break
                    out_f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        pct = int(10 + (downloaded / total_size) * 80)
                        self.operation_state["progress"] = min(90, pct)
                        mb_down = downloaded / (1024 * 1024)
                        mb_total = total_size / (1024 * 1024)
                        self.operation_state["message"] = (
                            f"Загрузка v{detected_version}: {mb_down:.1f} МБ / {mb_total:.1f} МБ ({pct}%)"
                        )

        self.operation_state.update({
            "progress": 92,
            "message": "Установка прав и создание ярлыков..."
        })

        # Make executable
        os.chmod(tmp_appimage, 0o755)

        # Atomic replace
        if p["appimage"].exists():
            p["appimage"].unlink()
        tmp_appimage.rename(p["appimage"])

        chown_path(str(p["appimage"]), uid, gid)

        # Create desktop entries
        self._create_shortcuts()

        # Install bundled skills and global KODA.md pkexec rule
        self.operation_state.update({
            "progress": 95,
            "message": "Установка скиллов и системных инструкций..."
        })
        self._install_skills()

        # Update .installed_apps.json
        self._update_installed_apps_json(detected_version)

        # Write metadata
        self._write_metadata({
            "name": "Koda Desktop",
            "version": detected_version,
            "installed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "appimage_path": str(p["appimage"]),
            "desktop_shortcut": str(p["desktop_shortcut"]),
            "menu_shortcut": str(p["menu_shortcut"]),
            "skills_dir": str(p["skills_dir"])
        })

        chown_path(str(p["apps_dir"]), uid, gid)
        chown_path(str(p["meta_dir"]), uid, gid)

        self.operation_state.update({
            "running": False,
            "action": None,
            "progress": 100,
            "message": f"Успешно установлено (v{detected_version})!",
            "error": None
        })

        return detected_version

    def _sync_uninstall(self):
        """Completely removes all files, shortcuts, and metadata."""
        p = self.paths
        self.operation_state.update({
            "running": True,
            "action": "uninstall",
            "progress": 20,
            "message": "Удаление файлов приложения...",
            "error": None
        })

        # Remove AppImage and runner script
        for f in [p["appimage"], p["run_script"]]:
            if f.is_file():
                try:
                    f.unlink()
                except Exception as e:
                    logger.error(f"Error removing {f}: {e}")

        # Kill any running processes
        try:
            user = self.user_info["username"]
            subprocess.run(["pkill", "-u", user, "-f", "koda-app"], capture_output=True)
            subprocess.run(["pkill", "-u", user, "-f", "Koda-Desktop"], capture_output=True)
            cfg_dir = Path(self.user_info["home"]) / ".config" / "koda-app"
            if cfg_dir.exists():
                for lock in cfg_dir.glob("Singleton*"):
                    try:
                        lock.unlink()
                    except Exception:
                        pass
        except Exception:
            pass

        self.operation_state["progress"] = 50
        self.operation_state["message"] = "Удаление ярлыков..."

        # Remove shortcuts
        for shortcut in [p["desktop_shortcut"], p["menu_shortcut"]]:
            if shortcut.is_file():
                try:
                    shortcut.unlink()
                except Exception as e:
                    logger.error(f"Error removing shortcut {shortcut}: {e}")

        # Remove metadata & skills directory
        if p["meta_dir"].is_dir():
            try:
                shutil.rmtree(p["meta_dir"], ignore_errors=True)
            except Exception as e:
                logger.error(f"Error removing meta_dir: {e}")

        # Remove from .installed_apps.json
        self._remove_from_installed_apps_json()

        # Update desktop database
        try:
            subprocess.run(["update-desktop-database", str(p["menu_apps_dir"])], capture_output=True, timeout=5)
        except Exception:
            pass

        # Remove installed skills
        self._uninstall_skills()

        self.operation_state.update({
            "running": False,
            "action": None,
            "progress": 100,
            "message": "Приложение полностью удалено.",
            "error": None
        })

    async def install_app(self, *args, **kwargs):
        """Starts asynchronous installation in background."""
        if self.operation_state["running"]:
            return {"success": False, "error": "Другая операция уже выполняется"}

        self.operation_state = {
            "running": True,
            "action": "install",
            "progress": 5,
            "message": "Подключение к серверу загрузки...",
            "error": None
        }

        asyncio.create_task(self._async_install_worker())
        return {"success": True, "started": True}

    async def _async_install_worker(self):
        async with self.operation_lock:
            try:
                version = await asyncio.to_thread(self._sync_download_and_install)
                logger.info(f"Install worker completed: v{version}")
            except Exception as e:
                logger.error(f"Install worker failed: {e}")
                self.operation_state.update({
                    "running": False,
                    "action": None,
                    "error": str(e),
                    "message": f"Ошибка установки: {e}"
                })

    async def reinstall_app(self, *args, **kwargs):
        """Starts asynchronous reinstallation in background."""
        if self.operation_state["running"]:
            return {"success": False, "error": "Другая операция уже выполняется"}

        self.operation_state = {
            "running": True,
            "action": "reinstall",
            "progress": 5,
            "message": "Подготовка к переустановке...",
            "error": None
        }

        asyncio.create_task(self._async_reinstall_worker())
        return {"success": True, "started": True}

    async def _async_reinstall_worker(self):
        async with self.operation_lock:
            try:
                await asyncio.to_thread(self._sync_uninstall)
                version = await asyncio.to_thread(self._sync_download_and_install)
                logger.info(f"Reinstall worker completed: v{version}")
            except Exception as e:
                logger.error(f"Reinstall worker failed: {e}")
                self.operation_state.update({
                    "running": False,
                    "action": None,
                    "error": str(e),
                    "message": f"Ошибка переустановки: {e}"
                })

    async def update_app(self, *args, **kwargs):
        """Starts asynchronous update check and download if newer."""
        if self.operation_state["running"]:
            return {"success": False, "error": "Другая операция уже выполняется"}

        self.operation_state = {
            "running": True,
            "action": "update",
            "progress": 5,
            "message": "Проверка наличия обновлений...",
            "error": None
        }

        asyncio.create_task(self._async_update_worker())
        return {"success": True, "started": True}

    async def _async_update_worker(self):
        async with self.operation_lock:
            try:
                check = await asyncio.to_thread(self._sync_check_remote_version)
                if not check.get("success"):
                    raise RuntimeError(check.get("error", "Не удалось проверить обновления"))

                remote_v = check["remote_version"]
                local_v = check.get("local_version")

                if local_v and not check.get("update_available"):
                    self.operation_state.update({
                        "running": False,
                        "action": None,
                        "progress": 100,
                        "message": f"Установлена актуальная версия (v{local_v}). Обновление не требуется."
                    })
                    return

                self.operation_state["message"] = f"Обновление с v{local_v} до v{remote_v}..."
                new_version = await asyncio.to_thread(self._sync_download_and_install, remote_v)
                logger.info(f"Update worker completed: v{new_version}")
            except Exception as e:
                logger.error(f"Update worker failed: {e}")
                self.operation_state.update({
                    "running": False,
                    "action": None,
                    "error": str(e),
                    "message": f"Ошибка обновления: {e}"
                })

    async def uninstall_app(self, *args, **kwargs):
        """Uninstalls Koda Desktop and cleans up shortcuts."""
        async with self.operation_lock:
            if self.operation_state["running"]:
                return {"success": False, "error": "Другая операция уже выполняется"}

            try:
                await asyncio.to_thread(self._sync_uninstall)
                return {"success": True}
            except Exception as e:
                logger.error(f"Uninstall failed: {e}")
                return {"success": False, "error": str(e)}

    async def launch_app(self, *args, **kwargs):
        """Launches Koda Desktop via runner script or AppImage with --no-sandbox."""
        p = self.paths
        if not p["appimage"].is_file():
            return {"success": False, "error": "Файл программы не найден. Сначала выполните установку."}

        try:
            uid = self.user_info["uid"]
            gid = self.user_info["gid"]
            home = self.user_info["home"]
            user = self.user_info["username"]

            # Remove stale singleton locks if no koda process is currently running
            try:
                ps = subprocess.run(["pgrep", "-u", user, "-f", "koda-app"], capture_output=True)
                if ps.returncode != 0:
                    cfg_dir = Path(home) / ".config" / "koda-app"
                    if cfg_dir.exists():
                        for lock in cfg_dir.glob("Singleton*"):
                            try:
                                lock.unlink()
                            except Exception:
                                pass
            except Exception:
                pass

            env = os.environ.copy()
            env["HOME"] = home
            env["USER"] = user
            env["LOGNAME"] = user
            env["XDG_RUNTIME_DIR"] = f"/run/user/{uid}"

            # Strip any LD_PRELOAD from Steam/parent
            env.pop("LD_PRELOAD", None)

            if "WAYLAND_DISPLAY" not in env:
                env["WAYLAND_DISPLAY"] = "gamescope-0" if os.path.exists(f"/run/user/{uid}/gamescope-0") else "wayland-0"
            if "DISPLAY" not in env:
                env["DISPLAY"] = ":0"

            def demote():
                def set_ids():
                    os.setgid(gid)
                    os.setuid(uid)
                return set_ids

            target = str(p["run_script"]) if p["run_script"].is_file() else str(p["appimage"])
            if p["run_script"].is_file():
                cmd = [target]
            else:
                cmd = [target]
                if not Path("/usr/lib/libfuse.so.2").exists() and not Path("/usr/lib64/libfuse.so.2").exists():
                    cmd.append("--appimage-extract-and-run")
                cmd.append("--no-sandbox")

            proc = subprocess.Popen(
                cmd,
                cwd=home,
                env=env,
                preexec_fn=demote(),
                start_new_session=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            logger.info(f"Launched Koda Desktop (PID: {proc.pid}) with target {target}")
            return {"success": True, "pid": proc.pid}
        except Exception as e:
            logger.error(f"Failed to launch Koda Desktop: {e}")
            return {"success": False, "error": str(e)}

    async def stop_app(self, *args, **kwargs):
        """Stops running Koda Desktop processes and cleans singleton locks."""
        try:
            user = self.user_info["username"]
            subprocess.run(["pkill", "-u", user, "-f", "koda-app"], capture_output=True)
            subprocess.run(["pkill", "-u", user, "-f", "Koda-Desktop"], capture_output=True)
            cfg_dir = Path(self.user_info["home"]) / ".config" / "koda-app"
            if cfg_dir.exists():
                for lock in cfg_dir.glob("Singleton*"):
                    try:
                        lock.unlink()
                    except Exception:
                        pass
            return {"success": True}
        except Exception as e:
            logger.error(f"Failed to stop Koda Desktop: {e}")
            return {"success": False, "error": str(e)}
