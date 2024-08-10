from flask import Flask, request, send_file
import json
import os
import sys
from datetime import datetime
from notion_client import Client

app = Flask(__name__)

# Determine the base path
if getattr(sys, 'frozen', False):
    # Running in a bundle
    base_path = sys._MEIPASS
else:
    # Running in Python env
    base_path = os.path.dirname(__file__)

try:
    # Load JSON key file for Notion API
    with open(os.path.join(base_path, 'notion-keys.json')) as source:
        info = json.load(source)
except FileNotFoundError:
    print("Error: JSON key file not found.")
    sys.exit(1)
except json.JSONDecodeError:
    print("Error: JSON key file is not properly formatted.")
    sys.exit(1)

try:
    # Initialize Notion client
    notion = Client(auth=info["notion_token"])
    database_id = info["database_id"]
except Exception as e:
    print(f"Error initializing Notion client: {e}")
    sys.exit(1)

def update_email_status(email_identifier, email_number):
    try:
        # Query the Notion database for the page with the matching email identifier
        response = notion.databases.query(
            **{
                "database_id": database_id,
                "filter": {
                    "property": "email_id",
                    "title": {
                        "equals": email_identifier
                    }
                }
            }
        )

        if response["results"]:
            page_id = response["results"][0]["id"]
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            # Update the page with the current time in the correct field
            notion.pages.update(
                page_id=page_id,
                properties={
                    f"Email {email_number} Opened": {
                        "date": {"start": current_time}
                    }
                }
            )
        else:
            print(f"Cannot find the email identifier: {email_identifier}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

@app.route('/read')
def tracking():
    try:
        email_id = request.args.get('id')
        email_num = int(request.args.get('num'))
        if email_id:
            update_email_status(email_id, email_num)
    except (TypeError, ValueError):
        print("Error: Invalid query parameters.")
    except Exception as e:
        print(f"An unexpected error occurred in the tracking route: {e}")
    # Return image
    return send_file(os.path.join(base_path, 'blank.png'), mimetype='image/png')

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5555)
    except Exception as e:
        print(f"Error starting the Flask server: {e}")
