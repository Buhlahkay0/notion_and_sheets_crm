from flask import Flask, request, send_file
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import json
import os
import sys
from datetime import datetime

app = Flask(__name__)

# Determine the base path
if getattr(sys, 'frozen', False):
    # Running in a bundle
    base_path = sys._MEIPASS
else:
    # Running in Python env
    base_path = os.path.dirname(__file__)

try:
    # Load JSON key file for Google Sheets API
    with open(os.path.join(base_path, 'read-receipts-key.json')) as source:
        info = json.load(source)
except FileNotFoundError:
    print("Error: JSON key file not found.")
    sys.exit(1)
except json.JSONDecodeError:
    print("Error: JSON key file is not properly formatted.")
    sys.exit(1)

try:
    # Credentials for Google Sheets API
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(
        info,
        ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    )
    gc = gspread.authorize(credentials)
except Exception as e:
    print(f"Error authorizing Google Sheets API: {e}")
    sys.exit(1)

try:
    # Open the spreadsheet and get the first sheet
    spreadsheet = gc.open('email-tracker')
    worksheet = spreadsheet.get_worksheet(0)
except gspread.exceptions.SpreadsheetNotFound:
    print("Error: Spreadsheet 'email-tracker' not found.")
    sys.exit(1)
except gspread.exceptions.WorksheetNotFound:
    print("Error: First sheet in the spreadsheet not found.")
    sys.exit(1)
except Exception as e:
    print(f"Error accessing the spreadsheet or sheet: {e}")
    sys.exit(1)

def update_email_status(email_identifier, email_number):
    try:
        cell = worksheet.find(email_identifier)
        if cell:
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            worksheet.update_cell(cell.row, cell.col + email_number, f'{current_time}')
        else:
            print(f"Cannot find the name: {email_identifier}")
    except gspread.exceptions.APIError as e:
        print(f"Encountered an API error: {e}")
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
