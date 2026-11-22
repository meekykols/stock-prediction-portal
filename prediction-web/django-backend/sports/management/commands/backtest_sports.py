"""
Walk-forward backtest of the sports models on past seasons.

  # 1. Download seasons once (uses API requests; free plans allow 2022-2024):
  python manage.py backtest_sports --data ./backtest-data --fetch football:39:2023,football:39:2024

  # 2. Test: the last season of each competition is predicted from everything before it.
  python manage.py backtest_sports --data ./backtest-data
  python manage.py backtest_sports --data ./backtest-data --sport football --fit-calibration

Files are stored as <sport>_<league>_<season>.json (MMA: league "all").
"""
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from django.core.management.base import BaseCommand, CommandError

from sports.services import providers, ratings
from sports.services.backtest import report, walk_forward


def _season_key(season):
    return str(season).split("-")[0]


class Command(BaseCommand):
    help = "Walk-forward backtest of the sports tip models."

    def add_arguments(self, parser):
        parser.add_argument("--data", required=True, help="Folder holding downloaded seasons")
        parser.add_argument("--fetch", help="Comma list of sport:league:season to download first (league 'all' for MMA)")
        parser.add_argument("--sport", help="Only this sport")
        parser.add_argument("--raw", action="store_true", help="Skip calibration")
        parser.add_argument("--fit-calibration", action="store_true", help="Fit the calibration power on the test seasons")

    def handle(self, *args, **opts):
        data = Path(opts["data"])
        data.mkdir(parents=True, exist_ok=True)
        if opts["fetch"]:
            for item in opts["fetch"].split(","):
                sport, league, season = item.split(":")
                events = providers.history(sport, None if league == "all" else int(league), int(season) if season.isdigit() else season)
                (data / f"{sport}_{league}_{season}.json").write_text(json.dumps(events))
                self.stdout.write(f"fetched {item}: {len(events)} finished events")

        groups = defaultdict(list)  # (sport, league) -> [(season, events)]
        for f in sorted(data.glob("*.json")):
            sport, league, season = f.stem.rsplit("_", 2) if f.stem.count("_") >= 2 else (None, None, None)
            if not sport or (opts["sport"] and sport != opts["sport"]):
                continue
            groups[(sport, league)].append((season, json.loads(f.read_text())))
        if not groups:
            raise CommandError("No season files found. Use --fetch first.")

        by_sport = defaultdict(list)
        for (sport, league), seasons in sorted(groups.items()):
            seasons.sort(key=lambda s: _season_key(s[0]))
            if len(seasons) < 2:
                self.stdout.write(f"skip {sport} {league}: need at least two seasons")
                continue
            train = [e for _, evs in seasons[:-1] for e in evs]
            records = walk_forward(sport, train, seasons[-1][1], calibrate=not opts["raw"] and not opts["fit_calibration"])
            by_sport[sport] += records
            r = report(records)
            self.stdout.write(f"{sport:18s} {league:5s} {seasons[-1][0]:10s} n={r['n']:5d} accuracy={r['accuracy']:.3f} logloss={r['logLoss']:.3f} "
                              + " ".join(f"{k}={v['accuracy']:.2f}({v['n']})" for k, v in sorted(r["byConfidence"].items())))

        for sport, records in by_sport.items():
            if opts["fit_calibration"]:
                best = min(np.arange(0.5, 2.51, 0.05), key=lambda a: report([{**r, "prediction": ratings.calibrate(sport, r["prediction"], a)} for r in records])["logLoss"])
                records = [{**r, "prediction": ratings.calibrate(sport, r["prediction"], best)} for r in records]
                self.stdout.write(self.style.SUCCESS(f"{sport}: best calibration power {best:.2f} (set ratings.CALIBRATION['{sport}'])"))
            r = report(records)
            self.stdout.write(self.style.MIGRATE_HEADING(f"\n{sport}: n={r['n']} accuracy={r['accuracy']:.3f} logloss={r['logLoss']:.3f} brier={r['brier']:.3f} calibration error={r['calibrationError']:.3f}"))
            for b in r["calibration"]:
                self.stdout.write(f"   stated {b['band']:9s} n={b['n']:5d}  said {b['stated']:.2f}  happened {b['actual']:.2f}")
            for k, v in sorted(r["byConfidence"].items()):
                self.stdout.write(f"   {k:6s} n={v['n']:5d} accuracy={v['accuracy']:.3f}")
