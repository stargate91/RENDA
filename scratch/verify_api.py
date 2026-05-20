import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    print("Testing imports and FastAPI router initialization...")
    from app.api.main import app
    print("FastAPI App initialized successfully!")
    
    # Print registered route paths
    print("\nRegistered route paths:")
    for route in app.routes:
        if hasattr(route, "path"):
            methods = getattr(route, "methods", "MOUNT")
            print(f"  {methods} - {route.path}")
            
except Exception as e:
    import traceback
    print("Failed to initialize FastAPI App!")
    traceback.print_exc()
    sys.exit(1)
