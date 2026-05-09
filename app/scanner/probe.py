import subprocess
import json
from typing import Dict, Any, Optional

class TechnicalProber:
    """
    FFmpeg (ffprobe) based technical metadata extraction engine.
    Retrieves stream details, codecs, and container metadata.
    """

    def probe(self, file_path: str) -> Dict[str, Any]:
        """
        Executes ffprobe on the given file and returns the raw JSON output.
        """
        cmd = [
            'ffprobe', 
            '-v', 'quiet', 
            '-print_format', 'json', 
            '-show_format', 
            '-show_streams', 
            file_path
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return json.loads(result.stdout)
        except Exception as e:
            # Errors are logged by the caller (ScannerManager)
            return {}

    def extract_info(self, probe_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filters and structures essential data from the raw ffprobe JSON response.
        Extracts duration, resolution, codecs, and internal stream metadata.
        """
        info = {
            "duration": None,
            "resolution": None,
            "video_codec": None,
            "audio_codec": None,
            "internal_title": None,
            "video_stream": {},
            "audio_streams": []
        }
        
        if not probe_data:
            return info

        # Container format data (Duration, Internal Title)
        fmt = probe_data.get('format', {})
        info["duration"] = float(fmt.get('duration', 0))
        info["internal_title"] = fmt.get('tags', {}).get('title')

        # Individual stream data (Video/Audio)
        for stream in probe_data.get('streams', []):
            stype = stream.get('codec_type')
            
            if stype == 'video' and not info["resolution"]:
                info["video_codec"] = stream.get('codec_name')
                w = stream.get('width')
                h = stream.get('height')
                if w and h:
                    info["resolution"] = f"{w}x{h}"
                info["video_stream"] = stream
                
            elif stype == 'audio':
                info["audio_streams"].append({
                    "codec": stream.get('codec_name'),
                    "channels": stream.get('channels'),
                    "language": stream.get('tags', {}).get('language'),
                    "title": stream.get('tags', {}).get('title')
                })
                if not info["audio_codec"]:
                    info["audio_codec"] = stream.get('codec_name')

        return info
