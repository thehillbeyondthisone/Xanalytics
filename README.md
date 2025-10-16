# Xanalytics 📊

A self-contained, browser-based tool for real-time log file analysis. It uses modern browser APIs to "tail" local files, parsing new lines as they are written and updating a metrics dashboard in real-time. The entire application is a single HTML file with no dependencies, no build step, and no server-side components. All processing is done client-side.

---

### Core Features

* **Live File Tailing**: Monitors a local file for changes, reading new data as it's appended. It also gracefully handles log rotation (when a file is cleared and starts over).
* **Regex-Based Parsing**: Extracts structured data from unstructured log lines using configurable regular expressions. It's pre-configured for Anarchy Online chat logs but can be adapted.
* **Dynamic UI**: Presents data in a filterable, sortable table and a dashboard for tracking key performance indicators (like XP/hour).
* **Client-Side Operation**: No data ever leaves your machine. All file reading and processing happens locally in the browser.
* **Data Export**: Session data can be exported to CSV for external analysis or as a JSON snapshot to save the current state.

---

* **Rarity Filter**: Use this to hide common clutter. If you only want to see valuable or interesting items, set this to "Uncommon+" or "Rare+" to hide all the junk.

* **Min Events**: This is great for cleaning up the view. If you only want to see items that have dropped at least 5 times, set this to "5" to hide anything that has appeared less frequently.

* **View Buttons (All, Kept, Discarded, Discarded-only)**: These are powerful one-click filters.
    * Click **"Kept"** to see everything you've actually picked up.
    * Click **"Discarded"** to see a list of everything you've thrown away.
    * Click **"Discarded-only"** to answer the question, "What am I *always* throwing away and never keeping?"

#### Key Settings Explained

* **Base % on all events**: When checked, the `%` column is calculated from the grand total of everything seen. If unchecked, it's calculated only from the items you've `Kept`. This helps you see an item's drop rate relative to only the things you consider valuable.

  ---

### Tracking Your XP Gain

The **XP Metrics** dashboard is designed to give you a live, at-a-glance view of your progress. It automatically detects different types of experience points from the log and calculates useful metrics to help you understand the efficiency of your gameplay.

#### Understanding the Main Display

At the top of the panel, you'll find four key indicators for the main types of XP: General XP, Alien XP (AXP), Shadowknowledge (SK), and Research. Each one shows:

* **Total**: The total amount of that XP type you've gained since you started the session. This is the big number.
* **Last 10 min Rate**: The first `/hr` number shows your XP gain rate calculated based *only on the last 10 minutes*. This is your current, "right now" efficiency. It reacts quickly if you switch to a more or less effective activity.
* **Session Rate**: The second `/hr` number is your average gain rate calculated over your *entire session*. This gives you a broader picture of your overall efficiency since you started tracking.
* **Last**: This shows the value of the most recent XP gain, letting you see the reward from your last action.

#### Setting Goals and Tracking ETAs

The three goal cards (for XP, AXP, and SK) turn the tool into a powerful planning utility.

1.  **Enter Your Goal**: In the input box for each card, type the total amount of XP you need to reach your next level or goal.
2.  **Watch the Progress Bar**: The bar will fill up as you gain XP, showing you a quick visual of how far you have to go. The label next to it gives you the exact numbers (`You Have / You Need`).
3.  **Check the ETA**: The "ETA" (Estimated Time of Arrival) tells you approximately how much longer it will take to reach your goal. **This estimate is based on your short-term (last 10 minutes) gain rate**, making it a dynamic prediction of when you'll finish if you continue at your current pace.

#### Using the XP Feed and Filters

* **XP Feed**: The box at the very bottom of the panel is a live feed that shows every individual XP gain as it happens. This is useful for seeing the immediate results of your actions.
* **XP Filters**: On the left-side panel, you can check or uncheck the different XP types. Unchecking a type will exclude it from all calculations on the dashboard—the totals, rates, ETAs, and the live feed will ignore it. This lets you focus only on the specific types of progress you care about at the moment.

---
### How It Works

The tool primarily relies on the **File System Access API**, which is the recommended mode for Chromium-based browsers.

When you attach a file, the application gets a special "handle" that allows it to securely interact with the file without having full access to your hard drive. A timer runs every second or so to check the file's properties.
* If the file's size has grown, the tool knows new lines have been added. It reads only the new part, from where it last left off to the new end of the file.

For browsers that don't support this modern API, the tool uses a fallback method. This involves a standard file input. Because this older method doesn't allow for reading just a small piece of a file, the tool has to quickly re-read the entire file on every check to see what's new. This is less efficient but ensures the tool still works.

* **Renormalize % to visible**: This is a powerful analysis tool. When checked, it recalculates all percentages based *only on the items currently shown in the table*. For example, if you filter the table down to just two rare items, this setting will show you how they compare to each other (e.g., one might be 60% of the filtered view, the other 40%).

---
