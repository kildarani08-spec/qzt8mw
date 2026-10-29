import os
from dotenv import load_dotenv

load_dotenv()

ELEXON_BASE_URL = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1/datasets")
DECISION_HOUR = int(os.getenv("DECISION_HOUR", "10"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
