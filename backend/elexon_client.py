import requests
from config import ELEXON_BASE_URL


def fetch_from_elexon(dataset, params):
    url = ELEXON_BASE_URL + "/" + dataset + "/stream"
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()