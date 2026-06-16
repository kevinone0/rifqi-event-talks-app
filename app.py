import time
from flask import Flask, render_template, jsonify, request
import requests
import feedparser
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Simple in-memory cache for feed data
_cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECS = 300  # 5 minutes cache

def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    
    # Return cached data if available and not expired/forced
    if not force_refresh and _cache["data"] is not None and (now - _cache["last_fetched"]) < CACHE_DURATION_SECS:
        return {
            "success": True,
            "updates": _cache["data"],
            "cached": True,
            "last_fetched": _cache["last_fetched"]
        }

    try:
        # Fetch the feed
        headers = {
            "User-Agent": "BigQueryReleaseNotesViewer/1.0 (Flask Web App)"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse XML with feedparser
        feed = feedparser.parse(response.content)
        
        if not feed.entries:
            raise ValueError("No entries found in the release notes feed.")
            
        updates = []
        update_id_counter = 0
        
        for entry in feed.entries:
            date_str = entry.title  # E.g. "June 15, 2026"
            content_html = entry.content[0].value if hasattr(entry, 'content') and entry.content else ""
            if not content_html and hasattr(entry, 'summary'):
                content_html = entry.summary
                
            entry_link = entry.link if hasattr(entry, 'link') else "https://cloud.google.com/bigquery/docs/release-notes"
            
            # Use BeautifulSoup to parse individual release notes
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_type = "Update"
            current_elements = []
            
            for element in soup.contents:
                # element can be a Tag or NavigableString
                if element.name == 'h3':
                    # Save previous update if exists
                    if current_elements:
                        update_content_html = "".join(str(el) for el in current_elements).strip()
                        temp_soup = BeautifulSoup(update_content_html, 'html.parser')
                        text_content = temp_soup.get_text()
                        
                        updates.append({
                            'id': f"up-{update_id_counter}",
                            'date': date_str,
                            'type': current_type,
                            'html': update_content_html,
                            'text': text_content,
                            'link': entry_link
                        })
                        update_id_counter += 1
                        current_elements = []
                    
                    current_type = element.get_text().strip()
                else:
                    current_elements.append(element)
            
            # Save the last update in this entry
            if current_elements:
                update_content_html = "".join(str(el) for el in current_elements).strip()
                temp_soup = BeautifulSoup(update_content_html, 'html.parser')
                text_content = temp_soup.get_text()
                updates.append({
                    'id': f"up-{update_id_counter}",
                    'date': date_str,
                    'type': current_type,
                    'html': update_content_html,
                    'text': text_content,
                    'link': entry_link
                })
                update_id_counter += 1
        
        # Update cache
        _cache["data"] = updates
        _cache["last_fetched"] = now
        
        return {
            "success": True,
            "updates": updates,
            "cached": False,
            "last_fetched": now
        }
    except Exception as e:
        # Fallback to cache on error if we have cached data
        if _cache["data"] is not None:
            return {
                "success": True,
                "updates": _cache["data"],
                "cached": True,
                "last_fetched": _cache["last_fetched"],
                "warning": f"Failed to fetch live feed, showing cached data. Error: {str(e)}"
            }
        return {
            "success": False,
            "error": str(e)
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    # Force refresh if parameter is present
    force = request.args.get('refresh', 'false').lower() == 'true'
    res = fetch_and_parse_feed(force_refresh=force)
    return jsonify(res)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
