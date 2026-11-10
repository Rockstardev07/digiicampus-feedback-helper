# DigiiCampus Common TA Feedback Helper 📋⚡

A lightweight Chrome / Edge extension built to streamline student feedback submission on **DigiiCampus** by automatically copying and submitting the duplicate **"Common TA"** feedback forms across both sections.

---

> [!IMPORTANT]
> ### ⚠️ Intended Use & Disclaimer
> **This tool is built solely to fill the "Common TA" feedback forms.**
>
> In college feedback cycles (such as SNU Chennai DigiiCampus), an extra evaluation form titled **"Common TA"** was added by mistake under each subject by college management. Although students were advised that Common TA can be ignored, the DigiiCampus portal blocks overall submission and flags the status as `"Feedback form not submitted"` if any form remains unfilled.
>
> **Please fill your actual faculty and course feedback manually and thoughtfully.** This tool simply copies your authentic responses from your already-submitted faculty form into the redundant "Common TA" form so the portal marks your feedback submission as 100% complete.

---

## ✨ Key Features

- **📑 Multi-Section Support**: Automatically handles both **Section 1 (Faculty Feedback)** and **Section 2 (Course Feedback)** without losing state.
- **💾 Storage Persistence**: Saves answers in browser storage so navigating between courses or tabs never wipes copied data.
- **⏱️ AngularJS Digest Pacing**: Built with 90ms pacing intervals to ensure AngularJS (1.x) processes every single radio selection cleanly without dropping clicks.
- **🛡️ 2-Section Verification Guard**: Verifies that both Section 1 and Section 2 have green checkmarks (`tick.svg`) before attempting to submit.
- **🎯 Precise Button Targeting**: Explicitly triggers the form's `saveResponse(true)` button and **strictly avoids** premature `submitSession()` triggers.
- **🎨 Sleek Floating Widget**: Injects an unobtrusive floating controller right onto the DigiiCampus bottom-right screen, plus a standard toolbar popup.

---

## 🚀 Installation Guide (Takes 20 Seconds)

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/Rockstardev07/digiicampus-feedback-helper.git
   ```
   *(Or download as ZIP and extract the folder)*

2. Open your browser's extension manager:
   - **Google Chrome**: Go to `chrome://extensions`
   - **Microsoft Edge**: Go to `edge://extensions`
   - **Brave**: Go to `brave://extensions`

3. Turn on **Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** (top-left).

5. Select the folder containing `manifest.json` (`digiicampus-feedback-extension`).

6. Open or refresh your [DigiiCampus Feedback](https://snuc.digiicampus.com/studentFeedback/2) page (`F5`).

---

## 📖 How to Use

1. **Fill your actual Faculty & Course Feedback manually**:
   - Complete the original subject feedback form and submit it normally.

2. **Copy the Original Responses**:
   - Open the completed original subject form.
   - Click **`📋 Step 1: Copy All Sections`** on the floating widget in the bottom-right corner.
   - The badge will show `🟢 Copied: 2 Sections (X Qs)`.

3. **Fill & Submit the "Common TA" Form**:
   - Open the **Common TA** form for that subject.
   - Click **`⚡ Step 2: Fill Both Sections & Submit`**.
   - The extension will automatically:
     1. Open and fill Section 1.
     2. Switch to Section 2 and fill Section 2.
     3. Verify green checkmarks on both sections.
     4. Wait 1.5 seconds for validation to settle.
     5. Click the form's **Submit** button (`saveResponse(true)`).

4. **Repeat for other subjects**:
   - Repeat steps 2 and 3 for each subject where a Common TA form is pending.

*(Optional)*: If all questions in both sections were rated **Excellent**, you can simply open Common TA and click **`⭐ Quick Fill All Excellent & Submit`** to complete it in one click!

---

## 🛠️ Tech Stack & Architecture

- **Manifest Version**: Manifest V3
- **Platform**: Vanilla JavaScript, CSS3, Chrome Extensions API (`chrome.storage`, `activeTab`, `scripting`)
- **Compatibility**: AngularJS 1.x & Angular Material (DigiiCampus portal)

---

## 📄 License

MIT License. Free to use for personal educational automation.
