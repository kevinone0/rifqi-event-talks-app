# BigQuery Release Notes Explorer & Tweeter

A sleek, responsive, and modern Python Flask web application that fetches Google Cloud BigQuery release notes in real-time, splits daily updates into individual readable cards, and lets you customize and share any update directly to X (Twitter).

---

## 🌟 Features

*   **Real-time Atom Feed Ingestion**: Connects directly to Google's official BigQuery release notes feed.
*   **Granular Update Splitting**: Automatically parses daily release notes entries and splits them into individual update cards based on category (e.g., *Feature, Breaking, Issue, Announcement, Change*).
*   **Interactive Filters & Search**: Filter updates instantly by category or search for specific terms (e.g., "Gemini", "UDF", "partitioning").
*   **In-Memory Smart Cache**: Implements backend caching for 5 minutes to ensure fast response times and prevent rate limits.
*   **Custom Tweet Composer**: Select any release card to slide up an integrated tweet builder. It features:
    *   Auto-drafted tweet templates.
    *   A character counter with an animated SVG progress ring (visual 280-character budget).
    *   One-click direct sharing via Twitter Web Intents.
*   **Premium Glassmorphic Theme**: A futuristic dark mode UI designed with smooth transitions, color-coded status badges, and ambient glowing backdrops.

---

## 🛠️ Tech Stack

*   **Backend**: Python 3.11, Flask
*   **Parsing Utilities**: `feedparser` (for XML feed processing), `BeautifulSoup4` (for HTML parsing & extraction)
*   **Frontend**: Vanilla HTML5, CSS3 (Custom Grid, Animations, Variables), Vanilla JavaScript (ES6)
*   **Icons**: Lucide Icons CDN

---

## 📂 Project Structure

```text
C:\Users\rifqi\agy-cli-projects\agy-cli-projects\
  ├── app.py                  # Main Flask server, API routing & cache logic
  ├── requirements.txt        # Python dependency configuration
  ├── .gitignore              # Files and folders to exclude from git
  ├── README.md               # Project documentation
  ├── templates/
  │   └── index.html          # Main HTML structure & layout
  └── static/
      ├── css/
      │   └── style.css       # Custom stylesheets, glassmorphic UI variables
      └── js/
          └── main.js         # API requests, dynamic rendering, search filters & Tweet Composer logic
```

---

## 🚀 Getting Started

Follow these instructions to set up and run the project locally on your machine.

### Prerequisites

Make sure you have **Python 3.8+** installed.

### Installation & Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/kevinone0/rifqi-event-talks-app.git
    cd rifqi-event-talks-app
    ```

2.  **Create and Activate Virtual Environment**:
    *   **Windows**:
        ```bash
        python -m venv .venv
        .venv\Scripts\activate
        ```
    *   **macOS / Linux**:
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate
        ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the Flask Server**:
    ```bash
    python app.py
    ```

5.  **Access the Application**:
    Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🔄 How it Works (API)

*   `GET /`: Serves the interactive user interface.
*   `GET /api/updates`: Fetches the processed release notes from the backend parser in JSON format.
*   `GET /api/updates?refresh=true`: Bypasses the 5-minute cache and forces a live fetch and parse directly from the Google Cloud XML feed.

---

## 📄 License

This project is open-source and available under the MIT License.
