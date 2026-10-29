from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from elexon_client import fetch_from_elexon
from config import DECISION_HOUR, FRONTEND_URL

UK_TIME = ZoneInfo("Europe/London")
UTC_TIME = ZoneInfo("UTC")

FIRST_DELIVERY_DAY = "2026-01-02"
LAST_DELIVERY_DAY = "2026-02-01"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["GET"],
    allow_headers=["*"]
)

accuracy_cache = {}


# ---------------- Helper functions ----------------

def get_start_time(item):
    return item["startTime"]


def to_utc_text(uk_datetime):
    utc_datetime = uk_datetime.astimezone(UTC_TIME)
    return utc_datetime.strftime("%Y-%m-%dT%H:%M:%SZ")


def get_time_window(date):
    delivery_day = datetime.strptime(date, "%Y-%m-%d")
    day_before = delivery_day - timedelta(days=1)

    decision_uk = datetime(day_before.year, day_before.month, day_before.day, DECISION_HOUR, 0, tzinfo=UK_TIME)
    day_start_uk = datetime(delivery_day.year, delivery_day.month, delivery_day.day, 0, 0, tzinfo=UK_TIME)
    day_end_uk = day_start_uk + timedelta(days=1)
    search_from_uk = decision_uk - timedelta(days=2)

    window = {
        "decision": to_utc_text(decision_uk),
        "dayStart": to_utc_text(day_start_uk),
        "dayEnd": to_utc_text(day_end_uk),
        "searchFrom": to_utc_text(search_from_uk)
    }
    return window


def fetch_actuals(from_date, to_date):
    params = {
        "settlementDateFrom": from_date,
        "settlementDateTo": to_date,
        "fuelType": "WIND"
    }
    return fetch_from_elexon("FUELHH", params)


def fetch_forecasts(publish_from, publish_to):
    params = {
        "publishDateTimeFrom": publish_from,
        "publishDateTimeTo": publish_to
    }
    return fetch_from_elexon("WINDFOR", params)


def make_actual_lookup(actual_data):
    lookup = {}
    for i in range(len(actual_data)):
        row = actual_data[i]
        lookup[row["startTime"]] = row["generation"]
    return lookup


def pick_latest_forecasts(forecast_data, window):
    latest = {}
    for i in range(len(forecast_data)):
        row = forecast_data[i]
        start_time = row["startTime"]
        publish_time = row["publishTime"]

        if start_time < window["dayStart"]:
            continue

        if start_time >= window["dayEnd"]:
            continue

        if publish_time > window["decision"]:
            continue

        if start_time in latest:
            saved_row = latest[start_time]
            if publish_time > saved_row["publishTime"]:
                latest[start_time] = row
        else:
            latest[start_time] = row

    result = []
    keys = list(latest.keys())
    for i in range(len(keys)):
        row = latest[keys[i]]
        item = {
            "startTime": row["startTime"],
            "publishTime": row["publishTime"],
            "generation": row["generation"]
        }
        result.append(item)

    result.sort(key=get_start_time)
    return result


def compare_with_actuals(forecast_rows, actual_lookup):
    rows = []
    for i in range(len(forecast_rows)):
        forecast_row = forecast_rows[i]
        start_time = forecast_row["startTime"]

        if start_time in actual_lookup:
            forecast_value = forecast_row["generation"]
            actual_value = actual_lookup[start_time]
            item = {
                "startTime": start_time,
                "forecast": forecast_value,
                "actual": actual_value,
                "error": forecast_value - actual_value
            }
            rows.append(item)
    return rows


def average_abs_error(rows):
    if len(rows) == 0:
        return 0
    total = 0
    for i in range(len(rows)):
        total = total + abs(rows[i]["error"])
    return round(total / len(rows))


# ---------------- Routes ----------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/actuals")
def get_actuals(date: str):
    data = fetch_actuals(date, date)

    result = []
    for i in range(len(data)):
        row = data[i]
        item = {
            "startTime": row["startTime"],
            "generation": row["generation"]
        }
        result.append(item)

    result.sort(key=get_start_time)
    return result


@app.get("/forecast")
def get_forecast(date: str):
    window = get_time_window(date)
    data = fetch_forecasts(window["searchFrom"], window["decision"])
    return pick_latest_forecasts(data, window)


@app.get("/day")
def get_day(date: str):
    forecast_rows = get_forecast(date)
    actual_lookup = make_actual_lookup(fetch_actuals(date, date))
    rows = compare_with_actuals(forecast_rows, actual_lookup)

    if len(forecast_rows) > 0:
        forecast_publish_time = forecast_rows[0]["publishTime"]
    else:
        forecast_publish_time = None

    return {
        "date": date,
        "forecastPublishTime": forecast_publish_time,
        "averageError": average_abs_error(rows),
        "rows": rows
    }


@app.get("/accuracy")
def get_accuracy():
    if "january" in accuracy_cache:
        return accuracy_cache["january"]

    first_window = get_time_window(FIRST_DELIVERY_DAY)
    last_window = get_time_window(LAST_DELIVERY_DAY)

    # Call 1: all forecasts for the month
    all_forecasts = fetch_forecasts(first_window["searchFrom"], last_window["decision"])

    # Call 2: all actuals for the month
    actual_lookup = make_actual_lookup(fetch_actuals(FIRST_DELIVERY_DAY, LAST_DELIVERY_DAY))

    first_day = datetime.strptime(FIRST_DELIVERY_DAY, "%Y-%m-%d")
    last_day = datetime.strptime(LAST_DELIVERY_DAY, "%Y-%m-%d")
    number_of_days = (last_day - first_day).days + 1

    all_rows = []
    for d in range(number_of_days):
        day = first_day + timedelta(days=d)
        date_text = day.strftime("%Y-%m-%d")
        window = get_time_window(date_text)
        forecast_rows = pick_latest_forecasts(all_forecasts, window)
        day_rows = compare_with_actuals(forecast_rows, actual_lookup)
        for i in range(len(day_rows)):
            all_rows.append(day_rows[i])

    count = len(all_rows)
    if count == 0:
        return {"message": "No data found"}

    total_abs_error = 0
    total_error = 0
    abs_errors = []
    worst_row = None
    hour_totals = {}
    hour_counts = {}

    for i in range(count):
        row = all_rows[i]
        error = row["error"]
        abs_error = abs(error)

        total_abs_error = total_abs_error + abs_error
        total_error = total_error + error
        abs_errors.append(abs_error)

        if worst_row is None:
            worst_row = row
        else:
            if abs_error > abs(worst_row["error"]):
                worst_row = row

        hour = row["startTime"][11:13]
        if hour in hour_totals:
            hour_totals[hour] = hour_totals[hour] + abs_error
            hour_counts[hour] = hour_counts[hour] + 1
        else:
            hour_totals[hour] = abs_error
            hour_counts[hour] = 1

    mae = round(total_abs_error / count)
    bias = round(total_error / count)

    abs_errors.sort()
    p90_index = int(0.9 * (count - 1))
    p90 = abs_errors[p90_index]

    by_hour = []
    hours = list(hour_totals.keys())
    hours.sort()
    for i in range(len(hours)):
        hour = hours[i]
        item = {
            "hour": hour,
            "averageError": round(hour_totals[hour] / hour_counts[hour])
        }
        by_hour.append(item)

    result = {
        "period": "Delivery " + FIRST_DELIVERY_DAY + " to " + LAST_DELIVERY_DAY,
        "hoursCompared": count,
        "mae": mae,
        "bias": bias,
        "p90": p90,
        "worstError": worst_row,
        "byHour": by_hour
    }

    accuracy_cache["january"] = result
    return result