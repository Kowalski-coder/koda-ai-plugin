import {
  ButtonItem,
  definePlugin,
  DialogButton,
  PanelSection,
  PanelSectionRow,
  ServerAPI,
  staticClasses
} from "decky-frontend-lib";
import React, { useEffect, useRef, useState, VFC } from "react";
import {
  FaCheckCircle,
  FaDownload,
  FaInfoCircle,
  FaPlay,
  FaRedo,
  FaSync,
  FaTrash
} from "react-icons/fa";

const DownloadIcon: any = FaDownload;
const PlayIcon: any = FaPlay;
const SyncIcon: any = FaSync;
const RedoIcon: any = FaRedo;
const TrashIcon: any = FaTrash;

// Официальный логотип Kodacode (знак для боковой вкладки Decky QAM)
const KodaLogoMark: VFC<{ size?: number; monochrome?: boolean }> = ({ size = 20, monochrome = false }) => {
  if (monochrome) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "inline-block", verticalAlign: "middle" }}
      >
        <path
          fill="currentColor"
          opacity="0.6"
          d="M 4.122 21.592 C 15.53 21.323 24.725 12.699 25.012 2 L 18.408 2 C 18.126 9.281 11.885 15.135 4.122 15.399 L 4.122 21.592 Z"
        />
        <path
          fill="currentColor"
          d="M 4.122 15.41 C 15.53 15.679 24.725 24.302 25.012 35.001 L 18.408 35.001 C 18.126 27.721 11.885 21.867 4.122 21.602 L 4.122 15.41 Z"
        />
        <path
          fill="currentColor"
          opacity="0.6"
          d="M 48.232 28.91 C 36.826 29.18 27.632 37.803 27.345 48.501 L 33.948 48.501 C 34.231 41.221 40.471 35.368 48.232 35.102 L 48.232 28.91 Z"
        />
        <path
          fill="currentColor"
          d="M 48.232 35.092 C 36.826 34.822 27.632 26.199 27.345 15.5 L 33.948 15.5 C 34.231 22.78 40.471 28.634 48.232 28.899 L 48.232 35.092 Z"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        <linearGradient id="kodaGradTab" x1="4.12" y1="25.2" x2="25.01" y2="25.2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c31bfa" />
          <stop offset="100%" stopColor="#ffcc3f" />
        </linearGradient>
        <linearGradient id="kodaGradTab2" x1="48.23" y1="25.3" x2="27.34" y2="25.3" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c31bfa" />
          <stop offset="100%" stopColor="#ffcc3f" />
        </linearGradient>
      </defs>
      <path
        fill="#bababa"
        d="M 4.122 21.592 C 15.53 21.323 24.725 12.699 25.012 2 L 18.408 2 C 18.126 9.281 11.885 15.135 4.122 15.399 L 4.122 21.592 Z"
      />
      <path
        fill="url(#kodaGradTab)"
        d="M 4.122 15.41 C 15.53 15.679 24.725 24.302 25.012 35.001 L 18.408 35.001 C 18.126 27.721 11.885 21.867 4.122 21.602 L 4.122 15.41 Z"
      />
      <path
        fill="#bababa"
        d="M 48.232 28.91 C 36.826 29.18 27.632 37.803 27.345 48.501 L 33.948 48.501 C 34.231 41.221 40.471 35.368 48.232 35.102 L 48.232 28.91 Z"
      />
      <path
        fill="url(#kodaGradTab2)"
        d="M 48.232 35.092 C 36.826 34.822 27.632 26.199 27.345 15.5 L 33.948 15.5 C 34.231 22.78 40.471 28.634 48.232 28.899 L 48.232 35.092 Z"
      />
    </svg>
  );
};

// Полный официальный логотип Kodacode (знак + слово "kodacode")
const KodaFullLogo: VFC<{ height?: number }> = ({ height = 28 }) => {
  const width = Math.round(height * (219 / 49));
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 219 49"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="kodaGradFull1" x1="4.12207" y1="25.2056" x2="25.0117" y2="25.2056" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c31bfa" />
          <stop offset="100%" stopColor="#ffcc3f" />
        </linearGradient>
        <linearGradient id="kodaGradFull2" x1="48.2324" y1="25.2959" x2="27.3447" y2="25.2959" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c31bfa" />
          <stop offset="100%" stopColor="#ffcc3f" />
        </linearGradient>
      </defs>
      <path fill="#bababa" d="M 4.12207 21.591801 C 15.5296 21.322701 24.7246 12.699299 25.0117 2 L 18.408199 2 C 18.1255 9.280781 11.8848 15.134598 4.12207 15.399399 L 4.12207 21.591801 Z"/>
      <path fill="url(#kodaGradFull1)" d="M 4.12207 15.409698 C 15.5296 15.678799 24.7246 24.302299 25.0117 35.001499 L 18.408199 35.001499 C 18.1255 27.720699 11.8848 21.867001 4.12207 21.6021 L 4.12207 15.409698 Z"/>
      <path fill="#bababa" d="M 48.232399 28.9097 C 36.8256 29.1796 27.6318 37.802799 27.3447 48.501499 L 33.9482 48.501499 C 34.2309 41.221298 40.470501 35.367699 48.232399 35.1021 L 48.232399 28.9097 Z"/>
      <path fill="url(#kodaGradFull2)" d="M 48.232399 35.091801 C 36.8256 34.821899 27.6318 26.1987 27.3447 15.5 L 33.9482 15.5 C 34.2309 22.7803 40.470501 28.633801 48.232399 28.899401 L 48.232399 35.091801 Z"/>
      <path fill="#ffffff" d="M 134.070007 35.904099 C 129.589996 35.904099 126.07 32.2561 126.07 27.3601 C 126.07 22.4321 129.589996 18.816099 134.070007 18.816099 C 136.341995 18.816099 138.134003 19.744101 139.285995 21.216101 L 139.285995 19.264099 L 143.542007 19.264099 L 143.542007 35.4561 L 139.285995 35.4561 L 139.285995 33.472099 C 138.134003 34.944099 136.341995 35.904099 134.070007 35.904099 Z M 134.806 32.128101 C 137.365997 32.128101 139.414001 30.1441 139.414001 27.3281 C 139.414001 24.5441 137.365997 22.5921 134.806 22.5921 C 132.149994 22.5921 130.261993 24.5441 130.261993 27.3281 C 130.261993 30.1441 132.149994 32.128101 134.806 32.128101 Z"/>
      <path fill="#ffffff" d="M 118.661003 12.095901 L 122.917 12.095901 L 122.917 35.455898 L 118.661003 35.455898 L 118.661003 33.471901 C 117.509003 34.943901 115.717003 35.9039 113.445 35.9039 C 108.964996 35.9039 105.445 32.255901 105.445 27.3599 C 105.445 22.4319 108.964996 18.815901 113.445 18.815901 C 115.717003 18.815901 117.509003 19.7439 118.661003 21.2159 L 118.661003 12.095901 Z M 114.181 32.127899 C 116.740997 32.127899 118.789001 30.1439 118.789001 27.3279 C 118.789001 24.5439 116.740997 22.5919 114.181 22.5919 C 111.525002 22.5919 109.637001 24.5439 109.637001 27.3279 C 109.637001 30.1439 111.525002 32.127899 114.181 32.127899 Z"/>
      <path fill="#ffffff" d="M 94.586098 35.904099 C 89.594101 35.904099 85.914101 32.192101 85.914101 27.3601 C 85.914101 22.496099 89.594101 18.816099 94.586098 18.816099 C 99.578102 18.816099 103.225998 22.496099 103.225998 27.3601 C 103.225998 32.192101 99.578102 35.904099 94.586098 35.904099 Z M 94.586098 32.064098 C 97.274101 32.064098 99.130096 30.0481 99.130096 27.3601 C 99.130096 24.6721 97.274101 22.656099 94.586098 22.656099 C 91.866096 22.656099 90.042099 24.6721 90.042099 27.3601 C 90.042099 30.0481 91.866096 32.064098 94.586098 32.064098 Z"/>
      <path fill="#ffffff" d="M 70.384003 29.7281 L 70.384003 35.4561 L 66 35.4561 L 66 13.056099 L 70.384003 13.056099 L 70.384003 23.9041 L 70.384003 29.7281 Z"/>
      <path fill="#ffffff" d="M 83.574203 13.056099 C 83.452202 17.774401 80.870697 21.895399 77.033203 24.255301 C 80.871002 26.615101 83.452103 30.737 83.574203 35.455502 L 79.256798 35.455502 C 79.0718 30.514 74.993797 26.5417 69.919899 26.361799 L 69.919899 22.149799 C 74.993896 21.969801 79.071999 17.997801 79.256798 13.056099 L 83.574203 13.056099 Z"/>
      <path fill="#ffffff" d="M 206.501007 29.096001 C 207.056 31.1014 208.559998 32.104 211.013 32.104 C 212.591995 32.104 213.785995 31.5707 214.597 30.504 L 217.925003 32.424 C 216.345993 34.706699 214.020996 35.848 210.949005 35.848 C 208.304001 35.848 206.181 35.048 204.580994 33.448002 C 202.981003 31.848 202.181 29.832001 202.181 27.4 C 202.181 24.989401 202.970001 22.983999 204.548996 21.384001 C 206.128006 19.762699 208.154007 18.952 210.628998 18.952 C 212.975998 18.952 214.906006 19.762699 216.421005 21.384001 C 217.957001 23.0054 218.725006 25.0107 218.725006 27.4 C 218.725006 27.933399 218.671997 28.498699 218.565002 29.096001 L 206.501007 29.096001 Z M 206.436996 25.896 L 214.597 25.896 C 214.362 24.808001 213.871994 23.9974 213.125 23.464001 C 212.399994 22.9307 211.567993 22.664 210.628998 22.664 C 209.520004 22.664 208.602005 22.952 207.876999 23.528 C 207.151993 24.082701 206.671997 24.872 206.436996 25.896 Z"/>
      <path fill="#ffffff" d="M 195.110001 13 L 199.238007 13 L 199.238007 35.400002 L 195.110001 35.400002 L 195.110001 33.512001 C 193.893997 35.069302 192.166 35.848 189.925995 35.848 C 187.770996 35.848 185.925995 35.0373 184.389999 33.416 C 182.875 31.7733 182.117996 29.768 182.117996 27.4 C 182.117996 25.032 182.875 23.0373 184.389999 21.416 C 185.925995 19.7733 187.770996 18.952 189.925995 18.952 C 192.166 18.952 193.893997 19.7307 195.110001 21.288 L 195.110001 13 Z M 187.494003 30.664 C 188.347 31.496 189.414001 31.912001 190.694 31.912001 C 191.973999 31.912001 193.029999 31.496 193.862 30.664 C 194.694 29.810699 195.110001 28.7227 195.110001 27.4 C 195.110001 26.077299 194.694 25 193.862 24.167999 C 193.029999 23.314699 191.973999 22.888 190.694 22.888 C 189.414001 22.888 188.347 23.314699 187.494003 24.167999 C 186.662003 25 186.246002 26.077299 186.246002 27.4 C 186.246002 28.7227 186.662003 29.810699 187.494003 30.664 Z"/>
      <path fill="#ffffff" d="M 177.613998 33.416 C 175.970993 35.037399 173.966003 35.848 171.598007 35.848 C 169.229996 35.848 167.225006 35.037399 165.582001 33.416 C 163.960999 31.773399 163.149994 29.768 163.149994 27.4 C 163.149994 25.032 163.960999 23.037399 165.582001 21.416 C 167.225006 19.773399 169.229996 18.952 171.598007 18.952 C 173.966003 18.952 175.970993 19.773399 177.613998 21.416 C 179.257004 23.037399 180.078003 25.032 180.078003 27.4 C 180.078003 29.768 179.257004 31.773399 177.613998 33.416 Z M 168.494003 30.568001 C 169.326004 31.4 170.360992 31.816 171.598007 31.816 C 172.835007 31.816 173.869995 31.4 174.701996 30.568001 C 175.533997 29.736 175.949997 28.68 175.949997 27.4 C 175.949997 26.120001 175.533997 25.063999 174.701996 24.232 C 173.869995 23.4 172.835007 22.983999 171.598007 22.983999 C 170.360992 22.983999 169.326004 23.4 168.494003 24.232 C 167.682999 25.063999 167.278 26.120001 167.278 27.4 C 167.278 28.68 167.682999 29.736 168.494003 30.568001 Z"/>
      <path fill="#ffffff" d="M 154.817001 35.848 C 152.406006 35.848 150.389999 35.037399 148.768997 33.416 C 147.169006 31.794701 146.369003 29.7894 146.369003 27.4 C 146.369003 25.0107 147.169006 23.0054 148.768997 21.384001 C 150.389999 19.762699 152.406006 18.952 154.817001 18.952 C 156.373993 18.952 157.792999 19.325399 159.072998 20.072001 C 160.352997 20.818701 161.322998 21.8214 161.985001 23.08 L 158.432999 25.16 C 158.113007 24.498699 157.621994 23.976 156.960999 23.591999 C 156.320999 23.208 155.595001 23.016001 154.785004 23.016001 C 153.546997 23.016001 152.522995 23.431999 151.712997 24.264 C 150.901993 25.074699 150.496994 26.120001 150.496994 27.4 C 150.496994 28.658701 150.901993 29.704 151.712997 30.535999 C 152.522995 31.346701 153.546997 31.752001 154.785004 31.752001 C 155.617004 31.752001 156.352997 31.5707 156.992996 31.208 C 157.654007 30.823999 158.145004 30.301399 158.464996 29.639999 L 162.048996 31.688 C 161.345001 32.946701 160.352997 33.959999 159.072998 34.728001 C 157.792999 35.474701 156.373993 35.848 154.817001 35.848 Z"/>
    </svg>
  );
};

interface OperationState {
  running: boolean;
  action: string | null;
  progress: number;
  message: string;
  error: string | null;
}

interface LimitGroup {
  name: string;
  model_group: string;
  used: number;
  max: number;
  remaining: number;
  percent: number;
  period: string;
  period_label: string;
  reset_text: string;
}

interface KodaLimits {
  ok: boolean;
  authenticated: boolean;
  user?: string;
  email?: string;
  tier?: string;
  message?: string;
  groups: LimitGroup[];
}

interface PluginStatus {
  installed: boolean;
  version: string | null;
  appimage_path: string;
  apps_dir: string;
  icon_path: string;
  desktop_shortcut: boolean;
  menu_shortcut: boolean;
  limits?: KodaLimits;
  operation: OperationState;
}

// Универсальный надёжный вызов методов бэкенда Decky
async function callPlugin<T = any>(
  serverApi: ServerAPI,
  method: string,
  ...args: any[]
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    if (typeof (serverApi as any).callable === "function") {
      const fn = (serverApi as any).callable(method);
      const res = await fn(...args);
      return { success: true, result: res };
    }
    const deckyBackend = (window as any).DeckyBackend;
    if (deckyBackend?.call) {
      const res = await deckyBackend.call("loader/call_plugin_method", "Koda AI", method, ...args);
      return { success: true, result: res };
    }
    const res = await (serverApi as any).callPluginMethod(method, args[0] || {});
    return res;
  } catch (err: any) {
    console.error(`[Koda AI] callPlugin(${method}) error:`, err);
    return { success: false, error: err?.message || String(err) };
  }
}

// Утилита для удаления ярлыков Koda из библиотеки Steam Game Mode
async function removeSteamKodaShortcuts(): Promise<void> {
  try {
    const sc = (window as any).SteamClient;
    if (!sc?.Apps?.RemoveShortcut) return;

    const spWin = (typeof (window as any).findSP === "function" ? (window as any).findSP() : null) || (window as any);
    const allApps: any[] = spWin.appStore?.allApps || (window as any).appStore?.allApps || spWin.collectionStore?.allApps || [];
    const candidateNames = ["koda desktop", "koda-desktop", "koda ai", "koda ai installer", "koda", "kodacode"];

    const targets = allApps.filter((a) => {
      const dName = String(a.display_name || a.name || "").replace(/^["']|["']$/g, "").trim().toLowerCase();
      return candidateNames.includes(dName);
    });

    for (const target of targets) {
      if (target?.appid) {
        await sc.Apps.RemoveShortcut(target.appid);
      }
    }
  } catch (e) {
    console.warn("[Koda AI] removeSteamKodaShortcuts error:", e);
  }
}

// Утилита для добавления Koda Desktop в Steam Game Mode
async function addSteamKodaShortcut(appimagePath: string, appsDir: string, iconPath: string): Promise<number | null> {
  try {
    const sc = (window as any).SteamClient;
    if (!sc?.Apps?.AddShortcut) return null;

    await removeSteamKodaShortcuts();

    const runScriptPath = appsDir ? `${appsDir}/koda-desktop-run.sh` : appimagePath;
    const targetExe = runScriptPath;

    const appid = await sc.Apps.AddShortcut("Koda Desktop", targetExe, appsDir || "", "");
    if (appid) {
      if (sc.Apps.SetShortcutName) {
        await sc.Apps.SetShortcutName(appid, "Koda Desktop");
      }
      if (sc.Apps.SetShortcutExe) {
        await sc.Apps.SetShortcutExe(appid, targetExe);
      }
      if (appsDir && sc.Apps.SetShortcutStartDir) {
        await sc.Apps.SetShortcutStartDir(appid, appsDir);
      }
      if (iconPath && sc.Apps.SetShortcutIcon) {
        await sc.Apps.SetShortcutIcon(appid, iconPath);
      }
      if (sc.Apps.SetShortcutLaunchOptions) {
        await sc.Apps.SetShortcutLaunchOptions(appid, "");
      }
      if (sc.Apps.ToggleEnableSteamOverlayForApp) {
        await sc.Apps.ToggleEnableSteamOverlayForApp(appid, false);
      }
      return appid;
    }
  } catch (e) {
    console.warn("[Koda AI] addSteamKodaShortcut error:", e);
  }
  return null;
}

// Запуск приложения через SteamClient
async function launchKodaInGameMode(): Promise<boolean> {
  try {
    const sc = (window as any).SteamClient;
    if (!sc?.Apps?.RunGame) return false;

    const spWin = (typeof (window as any).findSP === "function" ? (window as any).findSP() : null) || (window as any);
    const allApps: any[] = spWin.appStore?.allApps || (window as any).appStore?.allApps || spWin.collectionStore?.allApps || [];
    const candidateNames = ["koda desktop", "koda-desktop", "koda ai", "koda", "kodacode"];

    const target = allApps.find((a) => {
      const dName = String(a.display_name || a.name || "").replace(/^["']|["']$/g, "").trim().toLowerCase();
      return candidateNames.includes(dName);
    });

    if (target) {
      const gameId = typeof target.GetGameID === "function" ? target.GetGameID() : String(target.appid);
      await sc.Apps.RunGame(gameId, "", -1, 0);
      return true;
    }
  } catch (e) {
    console.warn("[Koda AI] launchKodaInGameMode error:", e);
  }
  return false;
}

const Content: VFC<{ serverApi: ServerAPI }> = ({ serverApi }) => {
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [remoteCheckMessage, setRemoteCheckMessage] = useState<string | null>(null);
  const [refreshingLimits, setRefreshingLimits] = useState<boolean>(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevRunningRef = useRef<boolean>(false);
  const lastActionRef = useRef<string | null>(null);

  const fetchStatus = async (): Promise<PluginStatus | null> => {
    try {
      const res = await callPlugin<PluginStatus>(serverApi, "get_status");
      if (res.success && typeof res.result === "object" && res.result !== null) {
        setStatus(res.result);
        return res.result;
      }
    } catch (e) {
      console.error("[Koda AI Installer] Error fetching status:", e);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleRefreshLimits = async () => {
    setRefreshingLimits(true);
    try {
      const res = await callPlugin(serverApi, "get_koda_limits");
      if (res.success && res.result) {
        setStatus((prev) => (prev ? { ...prev, limits: res.result } : null));
        showToast("Koda AI", "Лимиты обновлены");
      }
    } catch (e) {
      console.warn("Error refreshing limits:", e);
    } finally {
      setRefreshingLimits(false);
    }
  };

  const startPolling = () => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      const s = await fetchStatus();
      if (s && !s.operation?.running) {
        stopPolling();
      }
    }, 400);
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    fetchStatus().then((s) => {
      if (s?.operation?.running) {
        startPolling();
      }
    });

    return () => {
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (!status?.operation) return;

    const wasRunning = prevRunningRef.current;
    const isRunning = status.operation.running;

    if (isRunning) {
      lastActionRef.current = status.operation.action;
      startPolling();
    } else if (wasRunning && !isRunning) {
      stopPolling();

      const action = lastActionRef.current;
      lastActionRef.current = null;

      if (status.operation.error) {
        showToast("Ошибка", status.operation.error);
      } else {
        if (action === "install" || action === "update" || action === "reinstall") {
          addSteamKodaShortcut(status.appimage_path, status.apps_dir, status.icon_path).then((aid) => {
            if (aid) {
              console.log("[Koda AI] Registered Steam shortcut with ID:", aid);
            }
          });
          if (status.operation.message) {
            showToast("Koda AI", status.operation.message);
          }
        } else if (action === "uninstall") {
          removeSteamKodaShortcuts();
          if (status.operation.message) {
            showToast("Koda AI", status.operation.message);
          }
        }
      }
    }

    prevRunningRef.current = isRunning;
  }, [status]);

  const showToast = (title: string, body: string) => {
    try {
      serverApi.toaster.toast({
        title,
        body,
        duration: 4000
      });
    } catch (e) {
      console.warn("[Koda AI Installer] Toast failed:", e);
    }
  };

  const handleInstall = async () => {
    setRemoteCheckMessage(null);
    showToast("Koda AI", "Запуск загрузки и установки...");
    try {
      const res = await callPlugin(serverApi, "install_app");
      const data = typeof res.result === "object" ? res.result : null;
      if (!res.success || (data && !data.success)) {
        showToast("Ошибка", data?.error || String(res.error || "Не удалось запустить установку"));
      } else {
        startPolling();
      }
    } catch (e: any) {
      showToast("Ошибка", e?.message || String(e));
    }
    fetchStatus();
  };

  const handleUpdate = async () => {
    setRemoteCheckMessage(null);
    showToast("Koda AI", "Проверка актуальности версии...");
    try {
      const checkRes = await callPlugin(serverApi, "check_remote_version");
      const checkData = typeof checkRes.result === "object" ? checkRes.result : null;

      if (!checkRes.success || !checkData?.success) {
        showToast("Ошибка", checkData?.error || String(checkRes.error || "Не удалось проверить обновления"));
        return;
      }

      if (!checkData.update_available) {
        const msg = `Установлена актуальная версия (v${checkData.local_version || status?.version}). Обновление не требуется.`;
        setRemoteCheckMessage(msg);
        showToast("Koda AI", msg);
        return;
      }

      showToast("Koda AI", `Найдена версия v${checkData.remote_version}. Загрузка обновления...`);
      const updateRes = await callPlugin(serverApi, "update_app");
      const updateData = typeof updateRes.result === "object" ? updateRes.result : null;
      if (!updateRes.success || (updateData && !updateData.success)) {
        showToast("Ошибка", updateData?.error || String(updateRes.error || "Не удалось запустить обновление"));
      } else {
        startPolling();
      }
    } catch (e: any) {
      showToast("Ошибка", e?.message || String(e));
    }
    fetchStatus();
  };

  const handleReinstall = async () => {
    setRemoteCheckMessage(null);
    showToast("Koda AI", "Запуск переустановки...");
    try {
      const res = await callPlugin(serverApi, "reinstall_app");
      const data = typeof res.result === "object" ? res.result : null;
      if (!res.success || (data && !data.success)) {
        showToast("Ошибка", data?.error || String(res.error || "Не удалось запустить переустановку"));
      } else {
        startPolling();
      }
    } catch (e: any) {
      showToast("Ошибка", e?.message || String(e));
    }
    fetchStatus();
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setRemoteCheckMessage(null);
    showToast("Koda AI", "Удаление приложения...");
    try {
      await removeSteamKodaShortcuts();
      const res = await callPlugin(serverApi, "uninstall_app");
      const data = typeof res.result === "object" ? res.result : null;
      if (res.success && data?.success) {
        showToast("Удалено", "Koda Desktop и ярлыки полностью удалены.");
      } else {
        showToast("Ошибка", data?.error || String(res.error || "Не удалось удалить"));
      }
    } catch (e: any) {
      showToast("Ошибка", e?.message || String(e));
    }
    fetchStatus();
  };

  const handleLaunch = async () => {
    try {
      await callPlugin(serverApi, "stop_app");

      const nativeRun = await launchKodaInGameMode();
      if (nativeRun) {
        showToast("Koda AI", "Запуск Koda Desktop в игровом режиме...");
        return;
      }

      if (status?.appimage_path) {
        const aid = await addSteamKodaShortcut(status.appimage_path, status.apps_dir, status.icon_path);
        if (aid) {
          const runAfterAdd = await launchKodaInGameMode();
          if (runAfterAdd) {
            showToast("Koda AI", "Запуск Koda Desktop в игровом режиме...");
            return;
          }
        }
      }

      const res = await callPlugin(serverApi, "launch_app");
      const data = typeof res.result === "object" ? res.result : null;
      if (res.success && data?.success) {
        showToast("Koda AI", "Приложение запущено!");
      } else {
        showToast("Ошибка запуска", data?.error || String(res.error || "Не удалось запустить приложение"));
      }
    } catch (e: any) {
      showToast("Ошибка", e?.message || String(e));
    }
  };

  const isOpRunning = !!status?.operation?.running;
  const isInstalled = !!status?.installed;

  return (
    <>
      {/* 1. До установки Koda Desktop: логотип + описание возможностей */}
      {!isInstalled ? (
        <PanelSection>
          <PanelSectionRow>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "2px 0" }}>
              <KodaFullLogo height={26} />
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <div style={{ lineHeight: "1.45", color: "#dcdedf", fontSize: "0.85em", padding: "2px 0" }}>
              <div style={{ marginBottom: "8px" }}>
                <b>Koda AI</b> — десктопный клиент Kodacode для Steam Deck с поддержкой режима рабочего стола и Game Mode. Подходит для повседневных задач — от помощи с командами Linux до генерации текста и кода.
              </div>
              <div style={{ color: "#8f98a0", fontSize: "0.95em", paddingLeft: "2px" }}>
                <div style={{ marginBottom: "4px" }}>• Kodacode работает в отдельном приложении.</div>
                <div style={{ marginBottom: "4px" }}>• Подходит для обучения, администрирования системы, автоматизации и настроек конфигурации.</div>
                <div>• Имеет встроенные скиллы по работе со SteamOS.</div>
              </div>
            </div>
          </PanelSectionRow>
        </PanelSection>
      ) : isInstalled && status?.limits?.authenticated ? (
        /* 2. После установки: Лимиты Koda AI (если авторизован) */
        <PanelSection>
          <PanelSectionRow>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "2px 0" }}>
              <KodaFullLogo height={26} />
            </div>
          </PanelSectionRow>

          <PanelSectionRow>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "2px 0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 600, color: "#fff", fontSize: "0.92em" }}>
                  {status.limits.user || status.limits.email}
                </span>
                <span
                  style={{
                    background: "rgba(195, 27, 250, 0.2)",
                    border: "1px solid rgba(195, 27, 250, 0.4)",
                    color: "#e28aff",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontSize: "0.78em",
                    fontWeight: 600
                  }}
                >
                  {status.limits.tier}
                </span>
              </div>
              <div
                onClick={handleRefreshLimits}
                style={{
                  cursor: "pointer",
                  color: "#67c1f5",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px"
                }}
                title="Обновить лимиты"
              >
                <SyncIcon style={{ animation: refreshingLimits ? "spin 1s linear infinite" : "none" }} />
              </div>
            </div>
          </PanelSectionRow>

          {status.limits.groups?.map((group) => {
            const pctRemaining = group.max > 0 ? (group.remaining / group.max) * 100 : 0;
            return (
              <PanelSectionRow key={`${group.name}-${group.period}`}>
                <div style={{ width: "100%", padding: "2px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                      fontSize: "0.85em"
                    }}
                  >
                    <span style={{ color: "#dcdedf", fontWeight: 500 }}>{group.name}</span>
                    <span style={{ color: "#8f98a0" }}>
                      <b style={{ color: "#fff" }}>{group.remaining}</b> / {group.max}
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "rgba(255, 255, 255, 0.12)",
                      borderRadius: "3px",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, pctRemaining))}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #c31bfa 0%, #ffcc3f 100%)",
                        borderRadius: "3px",
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>

                  {group.reset_text && (
                    <div
                      style={{
                        fontSize: "0.76em",
                        color: "#67707b",
                        marginTop: "3px",
                        textAlign: "right"
                      }}
                    >
                      Сброс: {group.reset_text}
                    </div>
                  )}
                </div>
              </PanelSectionRow>
            );
          })}
        </PanelSection>
      ) : (
        /* 3. После установки, но вход в аккаунт ещё не выполнен */
        <PanelSection>
          <PanelSectionRow>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "2px 0" }}>
              <KodaFullLogo height={26} />
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <div style={{ fontSize: "0.85em", color: "#8f98a0", lineHeight: "1.35", padding: "2px 0" }}>
              Войдите в аккаунт в приложении Koda Desktop для отображения оставшихся квот моделей.
            </div>
          </PanelSectionRow>
        </PanelSection>
      )}

      {/* Секция действий: прогресс, сообщения и кнопки */}
      <PanelSection>
        {/* Прогресс выполнения операции */}
        {isOpRunning && (
          <PanelSectionRow>
            <div style={{ width: "100%", padding: "4px 0", boxSizing: "border-box" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                  fontSize: "0.85em"
                }}
              >
                <span
                  style={{
                    color: "#8f98a0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginRight: "8px"
                  }}
                >
                  {status?.operation?.message || "Выполняется..."}
                </span>
                <span style={{ color: "#67c1f5", fontWeight: "bold", flexShrink: 0 }}>
                  {status?.operation?.progress ?? 0}%
                </span>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "4px",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, status?.operation?.progress ?? 0))}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #c31bfa 0%, #ffcc3f 100%)",
                    borderRadius: "4px",
                    transition: "width 0.25s ease-out"
                  }}
                />
              </div>
            </div>
          </PanelSectionRow>
        )}

        {/* Уведомление после проверки обновления или ошибки */}
        {remoteCheckMessage && !isOpRunning && (
          <PanelSectionRow>
            <div
              style={{
                fontSize: "0.88em",
                color: "#67c1f5",
                background: "rgba(0, 170, 255, 0.1)",
                border: "1px solid rgba(0, 170, 255, 0.3)",
                padding: "6px 10px",
                borderRadius: "4px",
                width: "100%",
                boxSizing: "border-box",
                lineHeight: "1.3"
              }}
            >
              {remoteCheckMessage}
            </div>
          </PanelSectionRow>
        )}

        {/* Набор кнопок до установки */}
        {!isInstalled && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              disabled={isOpRunning || loading}
              onClick={handleInstall}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <DownloadIcon />
                <span>Установить Koda AI</span>
              </div>
            </ButtonItem>
          </PanelSectionRow>
        )}

        {/* Набор кнопок после установки */}
        {isInstalled && (
          <>
            <PanelSectionRow>
              <ButtonItem
                layout="below"
                disabled={isOpRunning}
                onClick={handleLaunch}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <PlayIcon style={{ color: "#4BB543" }} />
                  <span>Запустить</span>
                </div>
              </ButtonItem>
            </PanelSectionRow>

            <PanelSectionRow>
              <ButtonItem
                layout="below"
                disabled={isOpRunning}
                onClick={handleUpdate}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <SyncIcon />
                  <span>Обновить</span>
                </div>
              </ButtonItem>
            </PanelSectionRow>

            <PanelSectionRow>
              <ButtonItem
                layout="below"
                disabled={isOpRunning}
                onClick={handleReinstall}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <RedoIcon />
                  <span>Переустановить</span>
                </div>
              </ButtonItem>
            </PanelSectionRow>

            <PanelSectionRow>
              {!confirmDelete ? (
                <ButtonItem
                  layout="below"
                  disabled={isOpRunning}
                  onClick={() => setConfirmDelete(true)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <TrashIcon style={{ color: "#ff4444" }} />
                    <span style={{ color: "#ff6666" }}>Удалить</span>
                  </div>
                </ButtonItem>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: "0.85em", color: "#ffbb33", textAlign: "center" }}>
                    Удалить Koda Desktop и все ярлыки?
                  </div>
                  <div style={{ display: "flex", gap: "8px", width: "100%", boxSizing: "border-box" }}>
                    <DialogButton
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "8px 4px",
                        fontSize: "0.85em",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onClick={handleDelete}
                    >
                      <span style={{ color: "#ff4444" }}>Да, удалить</span>
                    </DialogButton>
                    <DialogButton
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "8px 4px",
                        fontSize: "0.85em",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onClick={() => setConfirmDelete(false)}
                    >
                      Отмена
                    </DialogButton>
                  </div>
                </div>
              )}
            </PanelSectionRow>
          </>
        )}
      </PanelSection>
    </>
  );
};

export default definePlugin((serverApi: ServerAPI) => {
  return {
    title: <div className={staticClasses.Title}>Koda AI</div>,
    content: <Content serverApi={serverApi} />,
    icon: <KodaLogoMark size={20} monochrome={true} />,
    onDismount() {
      // Cleanup on unmount
    }
  };
});
