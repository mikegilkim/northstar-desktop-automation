# Northstar Ticket Monitor

Northstar is a small Windows desktop tray app for keeping Jira, Microsoft Teams, Slack, or other chosen app windows visible in turn. It brings matching open windows to the front on a schedule and can optionally glide the pointer into the focused window and scroll a small, configured amount.

> **Important:** Northstar switches whole windows. It does not monitor message contents, detect ticket changes, or switch browser tabs inside a single browser window. It does not type, click, or create or save files. Keep your apps open and signed in before starting the monitor.

## What you need

- A Windows 10 or Windows 11 computer with an interactive desktop session.
- Node.js 20 LTS or newer, including npm. Get it from [nodejs.org](https://nodejs.org/).
- Internet access during the first dependency installation.
- Jira, Teams, Slack, or other target windows already open.

No programming experience is needed to use an installed copy of the app. The short setup section below is only needed when starting Northstar from its source folder.

## Start Northstar from this folder

1. Install Node.js if it is not already on your computer.
2. Open the Northstar folder in File Explorer.
3. Click the address bar, type `powershell`, and press Enter. A PowerShell window opens in that folder.
4. Type `npm install` and press Enter. Wait until it finishes. This is normally needed only once, or after an app update.
5. Type `npm start` and press Enter.
6. Northstar adds an icon to the Windows notification area and opens the dashboard in your browser. If you do not see its icon, click the small **^** arrow beside the clock to show hidden tray icons.

Leave the Northstar process running while you use the monitor. Closing the browser dashboard does not stop the tray app. To reopen the dashboard, click Northstar's tray icon or choose **Open dashboard** from its right-click menu. To fully exit, right-click the tray icon and choose **Quit Northstar**.

## First-time setup

1. Open Jira, Teams, and Slack as separate visible windows. Sign in to them yourself first.
2. Open the dashboard at <http://127.0.0.1:4173> if it did not open automatically.
3. Select **Settings** in the left navigation.
4. In **Window title fragments**, leave one identifying word or phrase per line. The default entries are `Jira`, `Teams`, and `Slack`. Northstar looks for visible window titles containing each phrase, without regard to capitalization.
5. Set the time to spend on Browser/Jira, Teams, and Slack. Values are in seconds and must be between 10 and 3600 seconds (one hour). For example, enter `60` to stay on each matching app for about a minute.
6. Choose whether Northstar should visibly move the pointer after a successful switch. The default destination is within the focused window. Other destinations are available if preferred.
7. Choose whether to scroll after a switch, its direction, and the number of wheel ticks (1–5). Scrolling requires pointer movement so the wheel action is sent over the focused window. Disable scrolling if you do not want the page position to change.
8. Select **Save settings**. The confirmation under the form tells you whether the settings were accepted.
9. Select **Start monitor**. The first matching window is focused immediately; subsequent windows are checked after the configured interval.

The monitor uses the title fragment `Jira` to identify the Browser/Jira interval, `Teams` for the Teams interval, and `Slack` for the Slack interval. Any other title fragment uses the Browser/Jira interval. If a phrase matches the wrong window, make it more specific—for example, use a distinctive part of the Jira window title.

## Use the dashboard and tray

- **Start monitor** begins rotating through the configured title fragments.
- **Pause** stops switching but keeps Northstar available in the tray.
- **Stop** ends the current run and resets the session timer.
- The dashboard shows current status, the selected title fragment, the last focused window, next target, last result, switch count, interval, and sampled mouse position.
- Right-click the tray icon for Start, Pause, Stop, Open dashboard, and Quit options. Hover over the icon for the current monitor status and target.
- The mouse telemetry panel samples pointer position every two seconds. It reports coordinates and the number of observed position changes; it does not record mouse clicks or identify who moved the pointer.

## How window matching works

Northstar searches the titles of visible desktop windows for each configured fragment. For example, if Teams' window title contains `Microsoft Teams`, a filter of `Teams` can match it. If no visible window matches, the dashboard reports that it could not find the title. Northstar will try that configured target again during its next rotation.

A browser with Jira and another website in different tabs is still one window. Northstar cannot choose or inspect an individual tab; use a dedicated browser window for Jira if you want it rotated separately from other browser work.

Windows can prevent one app from bringing another app forward, especially if one app was launched as Administrator and the other was not. Run Northstar and the apps at the same privilege level. The app cannot focus a window that is closed, hidden, or not present in the current Windows desktop session.

## Settings and local data

The monitor settings are saved on this computer in:

`%USERPROFILE%\.northstar-monitor-settings.json`

This is separate from the project folder and is not uploaded with the source code. Deleting this file resets Northstar's saved settings to defaults the next time it starts.

The monitor runs locally and serves its dashboard only on this computer at `127.0.0.1:4173`. Northstar does not connect to Jira, Teams, or Slack accounts and does not read, send, or change their content.

## Troubleshooting

### Northstar says it cannot find Jira, Teams, or Slack

- Make sure the app is open and its window is visible, not closed.
- Look at the exact text in the app's Windows title bar and use a distinctive part of it as the filter.
- Avoid overly broad terms: `Jira` could match an unrelated file or window whose title also contains that word.
- Save Settings, then Stop and Start the monitor to restart its rotation from the first target.

### The mouse moves but the page does not scroll

- Confirm **Scroll after each app switch** is enabled.
- Confirm **Move pointer visibly after each app switch** is enabled too.
- Set a small tick count such as `1` and try again. Northstar scrolls the focused window; a page may have no scrollable content at the pointer location.

### The dashboard does not open

- Check that Northstar is still running in the notification area.
- Open <http://127.0.0.1:4173> in a browser on the same computer.
- If another app is already using port 4173, close that app and restart Northstar.

### PowerShell or security software shows a warning

Northstar uses a bundled PowerShell helper to identify visible window titles, focus a selected window, sample the cursor, and perform the configured pointer/scroll actions. Review the source in `scripts/focus-window.ps1`; only run software you trust. Northstar does not need administrator access for normal use.

## Known limitations

- Windows is required for window focusing, pointer sampling, pointer movement, and scrolling. The dashboard server itself is local, but those desktop actions are Windows-specific.
- Matching is based on window-title fragments, not application APIs or account integrations.
- Settings for Windows startup, start-minimized behavior, emergency hotkeys, and profile editing are currently placeholders and do not configure Windows startup or register system-wide hotkeys.
- The tray-only service must remain running; quitting Northstar stops monitoring.

## Run the automated tests

If you are developing Northstar, open PowerShell in the project folder and run:

```powershell
npm test
```

## Project structure

- `main.js` — Electron tray app, lifecycle, and connection to the window monitor.
- `server.js` — local dashboard server, status API, and saved settings.
- `src/engine/WindowCycler.js` — title matching schedule and validation.
- `scripts/focus-window.ps1` — Windows APIs used for visible-window focus, pointer telemetry, pointer glide, and optional scrolling.
- `src/renderer/` — browser dashboard, settings, and styles.
- `test/engine.test.js` — automated regression tests.
- `assets/marvin.ico` — system tray icon.

## Safety and scope

Northstar is intended as a visible, user-operated display aid for apps you control. It only switches among configured visible windows and performs the optional, explicitly configured pointer movement and scrolling. It does not simulate typing or clicks, interact with ticket/message content, or attempt to conceal its operation.
