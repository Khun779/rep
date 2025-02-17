import yt_dlp
import uuid
import threading
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class VideoDownloader:
    def __init__(self):
        self.downloads: Dict[str, Dict[str, Any]] = {}
        
    def get_formats(self, url: str) -> list:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                formats = []
                for f in info.get('formats', []):
                    if f.get('ext') in ['mp4', 'webm', 'm4a', 'mp3']:
                        formats.append({
                            'format_id': f.get('format_id'),
                            'ext': f.get('ext'),
                            'quality': f.get('quality', 'unknown'),
                            'description': f.get('format_note', 'unknown')
                        })
                return formats
            except Exception as e:
                logger.error(f"Error extracting formats: {str(e)}")
                raise Exception("Failed to get video formats")

    def start_download(self, url: str, format_id: str) -> str:
        download_id = str(uuid.uuid4())
        self.downloads[download_id] = {
            'progress': 0,
            'status': 'starting',
            'error': None
        }
        
        thread = threading.Thread(
            target=self._download,
            args=(url, format_id, download_id)
        )
        thread.start()
        return download_id

    def _download(self, url: str, format_id: str, download_id: str):
        def progress_hook(d):
            if d['status'] == 'downloading':
                total = d.get('total_bytes', 0) or d.get('total_bytes_estimate', 0)
                if total:
                    downloaded = d.get('downloaded_bytes', 0)
                    progress = (downloaded / total) * 100
                    self.downloads[download_id]['progress'] = progress
                    self.downloads[download_id]['status'] = 'downloading'
            elif d['status'] == 'finished':
                self.downloads[download_id]['status'] = 'finished'
                self.downloads[download_id]['progress'] = 100

        ydl_opts = {
            'format': format_id,
            'progress_hooks': [progress_hook],
            'outtmpl': 'downloads/%(title)s.%(ext)s'
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            logger.error(f"Download error: {str(e)}")
            self.downloads[download_id]['status'] = 'error'
            self.downloads[download_id]['error'] = str(e)

    def get_progress(self, download_id: str) -> dict:
        if download_id not in self.downloads:
            return {'error': 'Download not found'}
        return self.downloads[download_id]
