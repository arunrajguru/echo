import torch
import platform
import os

def detect_device() -> dict:
    device_name = "cpu"
    is_cuda = False
    is_mps = False
    details = f"OS: {platform.system()} {platform.release()}, Python: {platform.python_version()}"

    if torch.cuda.is_available():
        device_name = "cuda"
        is_cuda = True
        details += f", CUDA Device: {torch.cuda.get_device_name(0)}"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device_name = "mps"
        is_mps = True
        details += ", Apple Silicon MPS"
    else:
        details += f", CPU cores: {os.cpu_count()}"

    return {
        "device": device_name,
        "is_cuda": is_cuda,
        "is_mps": is_mps,
        "details": details,
    }
