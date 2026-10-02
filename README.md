# Northstar Desktop Automation

## Required dependencies

- **Windows 10 or Windows 11** with a signed-in desktop session.
- **Node.js 20 LTS or newer** (includes npm): <https://nodejs.org/>
- Internet access for the first dependency installation.

## Setup and start

1. Download or clone this repository, then open the `northstar-desktop-automation` folder.
2. In File Explorer, open the folder, select the address bar, type `powershell`, and press Enter.
3. Install the app dependencies (first run only):

   ```powershell
   npm install
   ```

4. Start Northstar:

   ```powershell
   npm start
   ```

5. Northstar opens its dashboard at <http://127.0.0.1:4173> and appears in the Windows notification area. Keep the Northstar process running while using it; closing the browser does not stop the tray app.

## Configure the monitor

1. Open Jira, Teams, Slack, or other target apps as separate visible windows and sign in.
2. In the dashboard, select **Settings**.
3. Enter a distinctive window-title fragment for each target, one per line. Set the time for Browser/Jira, Teams, and Slack (10–3600 seconds each).
4. Choose whether to glide the pointer and scroll after each successful switch, then select **Save settings**.
5. Select **Start monitor**. Use **Pause** or **Stop** when needed.

Northstar switches visible windows by matching their title text. It does not switch between tabs inside one browser window, read app content, type, or click. Optional scrolling can move the page position.

To reopen the dashboard, click the tray icon or right-click it and choose **Open dashboard**. To exit the app, right-click the tray icon and choose **Quit Northstar**.

## Run tests (optional)

```powershell
npm test
```
