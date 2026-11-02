---
name: steamos
description: >
  REQUIRED for fixing, modifying, tweaking, or maintaining a SteamOS system —
  Valve's immutable, Arch-based "holo" distribution (Steam Deck and other AMD
  handhelds). Use when the user wants to install packages, edit system files,
  get past the read-only root filesystem, manage OS updates/branches, roll back
  or recover a broken system, switch between Gaming and Desktop mode, configure
  KDE Plasma / gamescope, set up SSH or dev tooling, install Flatpaks, or change
  how SteamOS behaves. Triggers: SteamOS, Steam Deck, read-only root,
  steamos-readonly, pacman on SteamOS, holo repos, steamos-update, A/B slot,
  Gaming Mode, Desktop Mode, gamescope, factory reset, deck user, sudo password.
  Hardware-agnostic: applies to any SteamOS (steamdeck variant) install.
metadata:
  type: reference
---

# SteamOS Skill

> [!IMPORTANT]
> **ПРАВИЛО ПРИВИЛЕГИЙ ROOT ДЛЯ KODA:**
> Любые команды, требующие прав администратора (root/sudo), Koda ОБЯЗАНА выполнять через `pkexec <команда>` вместо `sudo <команда>`, чтобы пользователю выводилось графическое окно ввода пароля на Steam Deck (как в Gaming Mode, так и в Desktop Mode).

Fix, modify, and maintain [SteamOS](https://store.steampowered.com/steamos) —
Valve's **immutable, Arch-based** Linux distribution (codename `holo`,
`ID_LIKE=arch`). This is NOT vanilla Arch, and the usual Arch instincts
(`pacman -Syu`, editing `/usr`, adding repos) will **break the system**.

This skill is for end-user maintenance and customization on installed systems.

## When This Skill MUST Be Used

**ALWAYS invoke this skill for requests involving ANY of these:**

- Setting a `sudo` password so system changes work at all (none is set by default)
- Installing packages or software on SteamOS (`pacman`, Flatpak, AUR asks)
- Editing system files or getting past the **read-only root filesystem**
- OS updates, update branches (stable/beta/main), or rolling back an update
- Recovering a system that won't boot, or is broken after a change
- Switching between **Gaming Mode** and **Desktop Mode** (KDE Plasma)
- Configuring gamescope, SDDM, sessions, or the desktop
- Setting up SSH, developer mode, or remote/dev access
- Factory reset, repartitioning, or firmware/BIOS updates
- Setting the `deck` password, hostname, timezone, or system services

**If you're about to change anything on a system whose `/etc/os-release` says
`ID=steamos`, STOP and use this skill first.** Always confirm state before
acting:

```bash
cat /etc/os-release        # ID=steamos, VARIANT_ID=steamdeck, VERSION_ID, BUILD_ID
steamos-readonly status    # enabled | disabled
```

## Critical Safety Rules

**The root filesystem is READ-ONLY by default and is REPLACED on every OS
update.** This single fact drives everything below. Before you change anything,
decide *which layer* the change belongs in so it survives.

1. **Re-enable read-only** (`sudo steamos-readonly enable`) when you finish work
   that required disabling it.
2. **NEVER `pacman -Syu` and NEVER point pacman at Arch mirrors or add
   unofficial repos.** SteamOS pins package versions to its release; a full/
   partial upgrade or mirror swap desyncs the system and breaks updates.
3. **Assume anything installed to the root filesystem is temporary** — it is
   erased by the next OS update. Persist the *script* that installs it, not the
   installed files.
4. **Prefer Flatpak and the `steamos-*` / `jupiter-*` helpers** over raw system
   edits — they are update-proof or FS-aware.
5. **Back up `/home` before any factory reset or repartitioning** — a factory
   reset erases it.
6. Report what you actually changed and **where it persists** (`/home` = forever,
   Flatpak = forever, `/etc` = across reboots but maybe reset on major update,
   root/pacman = wiped next update).

## System Architecture

SteamOS uses an **A/B partitioned atomic-update** scheme: two full copies of the
OS. An update writes the *inactive* slot and reboots into it, so an update never
touches the running system and the previous slot is always your rollback.

| Partition        | FS     | Role                                              | Persists? |
| ---------------- | ------ | ------------------------------------------------- | --------- |
| `esp`            | vfat   | EFI system partition (bootloader)                 | yes       |
| `efi-A`/`efi-B`  | vfat   | Per-slot EFI                                       | per-slot  |
| `rootfs-A`/`-B`  | btrfs  | The two OS root images (**read-only**, ~5G each)  | **wiped on update** |
| `var-A`/`-B`     | ext4   | Per-slot `/var`                                    | per-slot  |
| `home`           | ext4   | **`/home` — big, persistent, writable**            | **survives everything** |

**Where changes persist:**

| Change type                         | Put it in                          | Survives OS update? |
| ----------------------------------- | ---------------------------------- | ------------------- |
| User configs, scripts, apps, data   | `/home` (`~`, `/root`, `/opt`, `/srv`) | ✅ yes           |
| GUI applications                    | Flatpak (`/var/lib/flatpak` → `/home`) | ✅ yes           |
| `pacman -S` packages to root        | btrfs root                          | ❌ wiped            |
| System service/config tweaks        | `/etc` (an overlay; upper in `/var`) | ⚠️ across reboot, may reset on major update |

`/etc` is an **overlay filesystem** — hand edits persist across reboots but keep
a copy in `/home` of anything important. `/home` also bind-mounts
`/var/cache/pacman`, `/var/lib/docker`, and `/var/lib/flatpak`, so those persist.

## Prerequisite: Set a sudo Password (do this FIRST)

**SteamOS ships with NO password set for the `deck` user.** Out of the box `sudo`
will not work — it prompts for a password that has never been set, so it always
fails. Since almost everything in this skill (disabling read-only, `pacman`,
enabling services, most `steamos-*` helpers) needs `sudo`, **setting a password
is the first step before any system change.**

The `deck` user is already in `wheel` and configured for sudo — it just has no
password yet. Set one from a terminal (Desktop Mode → Konsole):

```bash
passwd            # prompts for a NEW password (there is no "current" one to enter)
```

Then verify sudo works:

```bash
sudo -v           # should accept the password you just set
```

Notes:
- Do this from **Desktop Mode**; `passwd` is interactive and needs a real
  terminal. If asked for a "current" password on a fresh system, just press
  Enter (there isn't one) — or if that's rejected, the account simply has an
  unset password and `passwd` will let you set a new one directly.
- The password lives in `/etc` and persists across reboots. A major OS update or
  factory reset can clear it — if `sudo` suddenly stops working after an update,
  re-run `passwd`.
- `steamos-passwd` is the Valve helper for the same job if you prefer it.

## Getting Write Access to Root

Root is read-only. To change it (requires a sudo password — see the prerequisite
above):

```bash
sudo steamos-readonly disable      # make / writable for this session
# ... do the specific operation that needs it ...
sudo steamos-readonly enable       # restore read-only (do this when done)
```

Prefer leaving read-only **enabled** except during the exact operation needing it.

## Package Management

### pacman (native, but for the root FS — treat as temporary)

Repos are **Valve's own**, not Arch mirrors: `jupiter-main`, `holo-main`,
`core-main`, `extra-main`, `multilib-main` (all via `/etc/pacman.d/mirrorlist`).
The keyring is often **not initialized** on a fresh system.

```bash
sudo steamos-readonly disable
sudo pacman-key --init
sudo pacman-key --populate archlinux holo   # populate before installing
sudo pacman -Sy                              # refresh only — NEVER -Syu
sudo pacman -S <package>
sudo steamos-readonly enable
```

- Installs land on the btrfs root and are **erased by the next OS update.** Keep
  a re-install script in `/home` (optionally a systemd unit / post-update hook).
- **Never** `-Syu`, never add repos, never swap in Arch mirrors.
- Prefer Flatpak for anything with a GUI.

### Flatpak (preferred — update-proof)

Flathub is preconfigured (`flathub` system remote, plus `flathub-beta`). Flatpak
apps live under `/home` and survive OS updates.

```bash
flatpak install flathub <app-id>
flatpak update
flatpak run <app-id>
```

## OS Updates, Branches, and Rollback

Updates go through `steamos-update` (**not** pacman) and are atomic.

```bash
steamos-update check                  # is an update available?
steamos-update                        # download + apply to the inactive slot
steamos-select-branch -l              # list branches
steamos-select-branch -c              # current branch
sudo steamos-select-branch beta       # switch branch, then run steamos-update
```

**Branches:** `stable` (default) → `beta` → `main`/`preview` (bleeding edge). The
device default is `STEAMOS_DEFAULT_UPDATE_BRANCH` in `/etc/os-release`.

**Rollback:** the previous OS slot is intact. Boot the other slot via the boot
manager (hold Volume-Down at power-on on a Deck) or inspect/manage boot config
with `steamos-bootconf`. Often the simplest fix for a botched root change is to
just let the next `steamos-update` replace the root slot entirely.

## Sessions: Gaming Mode vs Desktop Mode

SteamOS boots into **Gaming Mode** = Steam Big Picture under **gamescope** (a
Wayland micro-compositor). **Desktop Mode** = **KDE Plasma** (Wayland by default,
X11 available). Display manager is **SDDM**.

```bash
steamos-session-select                # show current session
steamos-session-select plasma         # switch to KDE Plasma (Desktop Mode)
steamos-session-select gamescope      # switch back to Gaming Mode
```

Session files live in `/usr/share/wayland-sessions/`
(`gamescope-wayland.desktop`, `plasma.desktop`) and `/usr/share/xsessions/`
(`plasmax11.desktop`).

- `steamos-nested-desktop` — run a desktop session nested inside Gaming Mode.
- `steamos-add-to-steam` — add a non-Steam app/shortcut to the library.
- `sudo /usr/bin/steamos-polkit-helpers/steamos-restart-sddm` — restart SDDM.

## The steamos-* / jupiter-* Helper Toolbox

SteamOS ships many privileged helpers in `/usr/bin/steamos-*` and polkit helpers
in `/usr/bin/steamos-polkit-helpers/`. **Prefer these over hand-editing** — they
handle the read-only FS and A/B layout correctly. Discover them with
`ls /usr/bin/steamos-* /usr/bin/steamos-polkit-helpers/`.

| Command                                       | Purpose                                |
| --------------------------------------------- | -------------------------------------- |
| `steamos-readonly {status,enable,disable}`    | Toggle root read-only                  |
| `steamos-update [check]`                      | Apply / check OS updates               |
| `steamos-select-branch`                       | Change update channel                  |
| `steamos-session-select`                      | Switch Gaming/Desktop session          |
| `steamos-devmode`                             | Toggle developer mode                  |
| `steamos-chroot`                              | Chroot into a slot for offline repair  |
| `steamos-mount`                               | Mount SteamOS partitions               |
| `steamos-factory-reset` / `steamos-reset-tool`| Factory reset (destructive)            |
| `steamos-passwd`                              | Manage the `deck` password             |
| `steamos-firmware-update` / `jupiter-biosupdate` | Firmware / BIOS updates             |
| `steamos-systemreport` / `steamos-dump-info`  | Gather system diagnostics              |

Privileged polkit helpers — run as
`sudo /usr/bin/steamos-polkit-helpers/<name>`:
`steamos-enable-sshd`, `steamos-set-hostname`, `steamos-set-timezone`,
`steamos-disable-wireless-power-management`, `steamos-format-sdcard`,
`steamos-format-device`, `jupiter-fan-control`, `steamos-restart-sddm`.

## SSH & Developer Access

```bash
# Supported helper (preferred):
sudo /usr/bin/steamos-polkit-helpers/steamos-enable-sshd
# or directly:
sudo systemctl enable --now sshd
passwd                                # set a password so login works
```

For serious dev work use `steamos-devmode` / the SteamOS Devkit. Disabling Wi-Fi
power management keeps remote sessions stable:
`sudo /usr/bin/steamos-polkit-helpers/steamos-disable-wireless-power-management`.

## Recovery & Safety

- **Won't boot:** boot the *other* A/B slot (known-good OS), or boot the SteamOS
  **Recovery image** (USB) and use `steamos-chroot` / `steamos-mount` to repair
  the offline slot.
- **`steamos-factory-reset`** wipes and reinstalls but **erases `/home`** — back
  up first. `steamos-reset-tool` gives a guided reset.
- **A pacman change broke things:** if still bootable, revert with pacman, or
  simply let the next `steamos-update` replace the root slot.
- Before any risky change: note `BUILD_ID` from `/etc/os-release` and remember
  the inactive slot is your rollback.

## Decision Framework

When the user requests a SteamOS change:

1. **Does a `steamos-*` / `jupiter-*` helper do it?** Use it — it's FS-aware.
2. **Is it a GUI app?** Install a **Flatpak** (survives updates).
3. **Is it an OS update / branch change?** Use `steamos-update` /
   `steamos-select-branch`, never pacman.
4. **Does it need a system-file edit?** Disable read-only, edit, **re-enable**;
   put anything that must persist in `/home` and document `/etc` edits.
5. **Is it a pacman package?** Warn it's wiped on the next OS update; script the
   re-install into `/home`. Never `-Syu`.
6. **Won't boot / bad state?** Roll back to the other slot or use the recovery
   image + `steamos-chroot`.

## Example Requests

- "Install `htop` on my Deck" → prefer Flatpak; if pacman is required, warn it's
  temporary: `steamos-readonly disable` → `pacman-key --init/--populate` →
  `pacman -S htop` → `steamos-readonly enable`, and offer a re-install script.
- "Install Firefox / a GUI app" → `flatpak install flathub org.mozilla.firefox`.
- "My root filesystem is read-only, I can't edit a file" → explain the immutable
  design, `sudo steamos-readonly disable`, edit, `sudo steamos-readonly enable`.
- "Switch to Desktop Mode / KDE" → `steamos-session-select plasma`.
- "Update to the beta channel" → `sudo steamos-select-branch beta` then
  `steamos-update`.
- "Enable SSH" → `steamos-polkit-helpers/steamos-enable-sshd` + `passwd`.
- "My last change broke boot" → boot the other A/B slot or recovery image, repair
  with `steamos-chroot`, or let `steamos-update` replace the root slot.
- "`sudo` says wrong password / won't work" → the `deck` user has **no password
  by default**; set one with `passwd` (see the prerequisite section), then retry.
- "Set the sudo password" → `passwd` (the `deck` user); no current password to
  enter on a fresh system.
- "Factory reset" → confirm first; warn `steamos-factory-reset` **erases /home**,
  back up, then run it.
