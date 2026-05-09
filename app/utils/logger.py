import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

def setup_logger(name="RENDA"):
    """
    Configures the central logger for file and console output.
    
    Features:
    - Rotating file handler (5MB per file, 5 backups).
    - UTF-8 encoding for Unicode/Emoji support.
    - Console output for development.
    """
    
    # Ensure logs directory exists in the project root
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "renda.log"

    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # Avoid adding duplicate handlers if the logger is already configured
    if logger.handlers:
        return logger

    # Log format: [Timestamp] [Level] [Module] Message
    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)-8s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 1. Rotating File Handler
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=5*1024*1024, 
        backupCount=5, 
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)

    # 2. Console (Stdout) Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO) # Default console level is INFO

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger

# Default logger instance
logger = setup_logger()
