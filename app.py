import os
import logging
from flask import Flask, render_template, request, jsonify, session
from downloader import VideoDownloader
import secrets

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", secrets.token_hex(16))

# Initialize the downloader
downloader = VideoDownloader()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-formats', methods=['POST'])
def get_formats():
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    try:
        formats = downloader.get_formats(url)
        return jsonify({'formats': formats})
    except Exception as e:
        logger.error(f"Error getting formats: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/download', methods=['POST'])
def download():
    url = request.json.get('url')
    format_id = request.json.get('format')
    
    if not url or not format_id:
        return jsonify({'error': 'URL and format are required'}), 400
    
    try:
        download_id = downloader.start_download(url, format_id)
        return jsonify({'download_id': download_id})
    except Exception as e:
        logger.error(f"Error starting download: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/progress/<download_id>')
def progress(download_id):
    progress = downloader.get_progress(download_id)
    return jsonify(progress)
