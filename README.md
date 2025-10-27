# Xanalytics 📊

A self-contained, browser-based tool for real-time log file analysis. It uses Chrome / Edge browser APIs to "tail" local files, parsing new lines as they are written and updating a metrics dashboard in real-time. The entire application is a single HTML file with no dependencies, no build step, and no server-side components.

---

### Core Features

* **Live File Tailing**: Monitors a local file for changes, reading new data as it's appended. It also gracefully handles log rotation (when a file is cleared and starts over).
* **Regex-Based Parsing**: Extracts structured data from unstructured log lines using configurable regular expressions. It's pre-configured for Anarchy Online chat logs but can be adapted.
* **Dynamic UI**: Presents data in a filterable, sortable table and a dashboard for tracking key performance indicators (like XP/hour).
* **Client-Side Operation**: No data ever leaves your machine. All file reading and processing happens locally in the browser.
* **Data Export**: Session data can be exported to CSV for external analysis or as a JSON snapshot to save the current state.

---

#### INSTRUCTIONS

* **Step 1: Create Log**: Open the "Friends" window, then right click your listed chat windows and create a new one (name it anything you like). Right click it and turn on logging; choosing "Show Log Window" will show the exact directory of the new log. This is the Log.txt you'll drop into Xanalytics in step 3.

* **Step 2: Subscribe to appropriate channels**: Open and right click your new chat window, and subscribe to the following channels:
*    -Vicinity Loot Messages
*    -Me got XP
*    -Me got SK

* **View Buttons**
    * Click **"Kept"** to see everything you've actually picked up.
    * Click **"Discarded"** to see a list of everything you've thrown away.

#### Key Settings Explained

* **Base % on all events**: When checked, the `%` column is calculated from the grand total of everything seen. If unchecked, it's calculated only from the items you've `Kept`. This helps you see an item's drop rate relative to only the things you consider valuable.

  ---

### Tracking Your XP Gain

The **XP Metrics** dashboard is designed to give you a live, at-a-glance view of your progress. It automatically detects different types of experience points from the log and calculates useful metrics based on that data.

#### Setting Goals and Tracking ETAs

The three goal cards (for XP, AXP, and SK) turn the tool into a powerful planning utility.

1.  **Enter Your Goal**: In the input box for each card, type the total amount of XP you need to reach your next level or goal.
2.  **Watch the Progress Bar**: The bar will fill up as you gain XP, showing you a quick visual of how far you have to go. The label next to it gives you the exact numbers (`You Have / You Need`).
3.  **Check the ETA**: The "ETA" (Estimated Time of Arrival) tells you approximately how much longer it will take to reach your goal. **This estimate is based on your short-term (last 10 minutes) gain rate**, making it a dynamic prediction of when you'll finish if you continue at your current pace.

#### Using the XP Feed and Filters

* **XP Feed**: The box at the very bottom of the panel is a live feed that shows every individual XP gain as it happens. This is useful for seeing the immediate results of your actions.
* **XP Filters**: On the left-side panel, you can check or uncheck the different XP types. Unchecking a type will exclude it from all calculations on the dashboard—the totals, rates, ETAs, and the live feed will ignore it. This lets you focus only on the specific types of progress you care about at the moment.

---
### Contact

Discord: YellowUmbrellaGroup#8576

---
