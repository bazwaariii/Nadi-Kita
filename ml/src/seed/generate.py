"""
Synthetic dataset generator for Nadi Kita (Lapis B, planning.md Section 9.2).
Uses fixed random seed 20261108 and samples (Recency, Frequency, Time) from UCI rows.
"""

from __future__ import annotations

from datetime import date, timedelta
import json
import pathlib
from typing import Any

import numpy as np

from data.download_uci import ensure_uci_dataset
from src.features import load_and_verify_uci

ROOT_DIR = pathlib.Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
SEED_VALUE = 20261108

FIRST_NAMES_M = [
    "Dimas", "Budi", "Rizky", "Fajar", "Arif", "Bagus", "Reza", "Hendra",
    "Dwi", "Eko", "Andi", "Rian", "Bayu", "Wahyu", "Ilham", "Yoga",
    "Galih", "Aditya", "Nanda", "Taufik", "Rama", "gilang".capitalize(), "Farhan", "Zaki",
]
FIRST_NAMES_F = [
    "Sari", "Ayu", "Putri", "Dewi", "Rina", "Nadia", "Maya", "Lestari",
    "Fitri", "Intan", "Wulan", "Citra", "Nisa", "Ratna", "Tiara", "Dian",
    "Siska", "Mega", "Kartika", "Salma", "amelia".capitalize(), "Yuni", "Vina", "Laras",
]
LAST_NAMES = [
    "Pratama", "Wijaya", "Susanto", "Saputra", "Hidayat", "Nugroho",
    "Santoso", "Kusuma", "Wibowo", "Setiawan", "Permana", "Utami",
    "Rahmawati", "Purnomo", "Hakim", "Firmansyah", "Gunawan", "Suryani",
    "Maulana", "Kurniawan", "Putra", "lestari".capitalize(), "anggraini".capitalize(), "wardhana".capitalize(),
]

# Blood group proportions per planning.md Section 9.2 (320 profiles)
BLOOD_GROUP_COUNTS = [
    ("A_POS", 80),   # 25.0%
    ("B_POS", 77),   # ~24.0%
    ("O_POS", 106),  # ~33.1%
    ("AB_POS", 25),  # ~7.8%
    ("A_NEG", 8),    # 2.5%
    ("B_NEG", 8),    # 2.5%
    ("O_NEG", 11),   # ~3.4%
    ("AB_NEG", 5),   # ~1.6%
]

INITIAL_STOCK = [
    {"group": "A_POS", "units": 26, "criticalAt": 8, "safeAt": 20},
    {"group": "B_POS", "units": 13, "criticalAt": 8, "safeAt": 20},
    {"group": "O_POS", "units": 30, "criticalAt": 10, "safeAt": 24},
    {"group": "AB_POS", "units": 11, "criticalAt": 4, "safeAt": 10},
    {"group": "A_NEG", "units": 4, "criticalAt": 2, "safeAt": 5},
    {"group": "B_NEG", "units": 3, "criticalAt": 2, "safeAt": 5},
    {"group": "O_NEG", "units": 2, "criticalAt": 3, "safeAt": 6},
    {"group": "AB_NEG", "units": 1, "criticalAt": 1, "safeAt": 3},
]


def generate_synthetic_dataset(reference_date: date | None = None) -> dict[str, Any]:
    """Generate the 320 synthetic donor profiles + 15 volunteer pilot accounts."""
    ref_day = reference_date or date(2026, 11, 8)
    rng = np.random.default_rng(SEED_VALUE)

    csv_path = ensure_uci_dataset()
    uci_df, _ = load_and_verify_uci(csv_path)

    groups: list[str] = []
    for bg, count in BLOOD_GROUP_COUNTS:
        groups.extend([bg] * count)
    assert len(groups) == 320
    rng.shuffle(groups)

    donors: list[dict[str, Any]] = []
    cooldown_days = 60

    for idx in range(320):
        num = idx + 1
        sex = "M" if rng.random() < 0.60 else "F"
        first = rng.choice(FIRST_NAMES_M if sex == "M" else FIRST_NAMES_F)
        last = rng.choice(LAST_NAMES)
        full_name = f"{first} {last}"

        # Age 18-45, mean around 27
        age_years = int(np.clip(rng.normal(27, 6.5), 18, 45))
        birth_offset_days = age_years * 365 + int(rng.integers(0, 364))
        birth_date = (ref_day - timedelta(days=birth_offset_days)).isoformat()

        contact_consent = bool(rng.random() < 0.92)
        is_first_timer = bool(rng.random() < 0.08)

        donations_dates: list[str] = []
        first_donation_at: str | None = None
        last_donation_at: str | None = None
        next_eligible_at: str | None = None
        donation_count = 0

        if not is_first_timer:
            uci_row = uci_df.iloc[int(rng.integers(0, len(uci_df)))]
            raw_r = float(uci_row["recency"])
            raw_f = int(uci_row["frequency"])
            raw_t = float(uci_row["tenure"])

            # Make ~25% of repeat donors currently in cooldown (< 60 days) so filtering is visible
            if rng.random() < 0.25:
                days_since_last = int(rng.integers(7, cooldown_days - 2))
            else:
                days_since_last = max(
                    cooldown_days + 5,
                    int(round(raw_r * 30.4 + rng.normal(0, 8))),
                )

            last_dt = ref_day - timedelta(days=days_since_last)
            total_span_days = max(
                days_since_last,
                int(round(raw_t * 30.4 + rng.normal(0, 12))),
            )
            first_dt = ref_day - timedelta(days=total_span_days)

            max_possible_f = max(1, 1 + (last_dt - first_dt).days // cooldown_days)
            actual_f = max(1, min(raw_f, int(max_possible_f), 12))

            if actual_f == 1:
                first_dt = last_dt
                donations_dates = [last_dt.isoformat()]
            else:
                step = max(cooldown_days, (last_dt - first_dt).days // (actual_f - 1))
                cur = last_dt
                temp_dates = []
                for _ in range(actual_f):
                    temp_dates.append(cur)
                    cur = cur - timedelta(days=step)
                temp_dates.reverse()
                first_dt = temp_dates[0]
                donations_dates = [d.isoformat() for d in temp_dates]

            donation_count = len(donations_dates)
            first_donation_at = first_dt.isoformat()
            last_donation_at = last_dt.isoformat()
            next_eligible_at = (last_dt + timedelta(days=cooldown_days)).isoformat()

        donors.append(
            {
                "code": f"dnr_{num:03d}",
                "fullName": full_name,
                "email": f"donor{num:03d}@contoh.test",
                "phone": f"0899-0000-{num:04d}",
                "birthDate": birth_date,
                "sex": sex,
                "bloodGroup": str(groups[idx]),
                "cohort": None,
                "contactConsent": contact_consent,
                "firstDonationAt": first_donation_at,
                "lastDonationAt": last_donation_at,
                "donationCount": donation_count,
                "nextEligibleAt": next_eligible_at,
                "isSynthetic": True,
                "donations": donations_dates,
            }
        )

    # 15 volunteer accounts in cohort "pilot-2026" (B+, eligible, per Section 9.2)
    volunteers: list[dict[str, Any]] = []
    volunteer_names = [
        ("Rizky Pratama", "M", 5, 110, 420),
        ("Sari Wijaya", "F", 7, 130, 620),
        ("Dimas Saputra", "M", 6, 95, 510),
        ("Nadia Kusuma", "F", 4, 105, 360),
        ("Fajar Hidayat", "M", 8, 120, 740),
        ("Ayu Rahmawati", "F", 3, 85, 250),
        ("Bagus Santoso", "M", 5, 140, 480),
        ("Putri Utami", "F", 4, 100, 340),
        ("Arif Nugroho", "M", 6, 90, 540),
        ("Dewi Lestari", "F", 3, 115, 290),
        ("Reza Firmansyah", "M", 5, 125, 450),
        ("Maya Suryani", "F", 2, 95, 190),
        ("Ilham Maulana", "M", 4, 135, 390),
        ("Citra Anggraini", "F", 3, 102, 270),
        ("Bayu Kurniawan", "M", 2, 88, 180),
    ]

    for i, (vname, vsex, vfreq, last_days_ago, first_days_ago) in enumerate(volunteer_names, start=1):
        last_dt = ref_day - timedelta(days=last_days_ago)
        first_dt = ref_day - timedelta(days=first_days_ago)
        volunteers.append(
            {
                "code": f"vol_{i:02d}",
                "fullName": vname,
                "email": f"relawan{i:02d}@contoh.test",
                "phone": f"0899-9000-{i:04d}",
                "birthDate": (ref_day - timedelta(days=23 * 365 + i * 17)).isoformat(),
                "sex": vsex,
                "bloodGroup": "B_POS",
                "cohort": "pilot-2026",
                "contactConsent": True,
                "firstDonationAt": first_dt.isoformat(),
                "lastDonationAt": last_dt.isoformat(),
                "donationCount": vfreq,
                "nextEligibleAt": (last_dt + timedelta(days=cooldown_days)).isoformat(),
                "isSynthetic": True,
            }
        )

    payload = {
        "seed": SEED_VALUE,
        "referenceDate": ref_day.isoformat(),
        "branch": {
            "name": "UTD Simulasi Surabaya",
            "city": "Surabaya",
            "isSimulated": True,
        },
        "initialStock": INITIAL_STOCK,
        "donors": donors,
        "volunteers": volunteers,
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ARTIFACTS_DIR / "synthetic_seed.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


if __name__ == "__main__":
    data = generate_synthetic_dataset()
    print(
        f"[ml:seed] Generated {len(data['donors'])} synthetic donors + "
        f"{len(data['volunteers'])} pilot-2026 volunteers."
    )

