import os
import platform
from pathlib import Path

def to_win_long_path(path_str: str) -> str:
    """
    Converts a path to a Windows extended-length path (\\?\) if on Windows.
    This bypasses the 260 character MAX_PATH limit.
    """
    if platform.system() != "Windows":
        return path_str
    
    # Already a long path or relative path
    if path_str.startswith("\\\\?\\") or not os.path.isabs(path_str):
        return path_str
        
    # Convert to absolute and add prefix
    abs_path = os.path.abspath(path_str)
    
    # Handle UNC paths (\\server\share -> \\?\UNC\server\share)
    if abs_path.startswith("\\\\"):
        return "\\\\?\\UNC\\" + abs_path[2:]
    
    return "\\\\?\\" + abs_path

def ensure_long_path_support():
    """
    Monkey-patch or utility to ensure common FS operations handle long paths.
    """
    pass
