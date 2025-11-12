# Xanalytics 📊

A self-contained, browser-based tool for real-time log file analysis. It uses Chrome / Edge browser APIs to "tail" local files, parsing new lines as they are written and updating a metrics dashboard in real-time. The entire application is a single HTML file with no dependencies, no build step, and no server-side components.

---

### Core Features

* **Live File Tailing**: Monitors a local file for changes, reading new data as it's appended. It also gracefully handles log rotation (when a file is cleared and starts over).
* **Semi-persistent log storage.
* **Regex-Based Parsing**: Extracts structured data from unstructured log lines using configurable regular expressions. It's pre-configured for Anarchy Online chat logs but can be adapted.
* **Dynamic UI**: Presents data in a filterable, sortable table and a dashboard for tracking key performance indicators (like XP/hour).
* **Client-Side Operation**: No data ever leaves your machine. All file reading and processing happens locally in the browser.
* **Data Export**: Session data can be exported to CSV for external analysis or as a JSON snapshot to save the current state.
* **Three moody, built in themes.
* **Collapsable instructions panel, and assorted settings.

---

#### INSTRUCTIONS

* **Step 1: Create Log**: Open the "Friends" window, then right click your listed chat windows and create a new one (name it anything you like). Right click it and turn on logging; choosing "Show Log Window" will show the exact directory of the new log. This is the Log.txt you'll drop into Xanalytics in step 3.

* **Step 2: Subscribe to appropriate channels**: Open and right click your new chat window, and subscribe to the following channels:
*    -Vicinity Loot Messages
*    -Research
*    -Me got XP
*    -Me got SK

* Step 3: Locate your log file*
    * Navigate to the directory shown in "Show Log Window in AO"
    * Drag your new log file to the dropzone in Xanalytics (NOTE: If you just created this window/log, you may need to loot something or gain xp to generate the Log.txt)
    * Name and save your log file to easily load it next time.
    * That's it.

### Tracking Your XP Gain

The **XP Metrics** dashboard is designed to give you a live, at-a-glance view of your progress. It automatically detects different types of experience points from the log and calculates useful metrics based on that data.

#### Using the XP Feed and Filters

* **XP Feed**: The box at the very bottom of the panel is a live feed that shows every individual XP gain as it happens. This is useful for seeing the immediate results of your actions.
* **XP Filters**: On the left-side panel, you can check or uncheck the different XP types. Unchecking a type will exclude it from all calculations on the dashboard—the totals, rates, ETAs, and the live feed will ignore it. This lets you focus only on the specific types of progress you care about at the moment.

---
### Contact

Discord: YellowUmbrellaGroup#8576

---

#### ADDITIONAL NOTES:

* **If you plan to use Hydra (you should), subscribe to all chat channels except pets. You will be able to use the same log file without creating a new window; the lines will be parsed and sorted correctly, and can be run concurrently.**
