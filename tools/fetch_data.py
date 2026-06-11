#!/usr/bin/env python3
"""Build the data snapshot for neo-swarm.

Sources:
  - NEO orbital elements: NASA/JPL Small-Body Database Query API
    https://ssd-api.jpl.nasa.gov/sbdb_query.api
  - Close approaches:     NASA/JPL CNEOS Close-Approach Data API
    https://ssd-api.jpl.nasa.gov/cad.api
  - Star catalog:         d3-celestial (BSC5 / HYG derived), mag <= 8.5
    https://github.com/ofrohn/d3-celestial

Writes assets/data/{neos,cad,stars}.json. Run from the repo root:
    python3 tools/fetch_data.py
Cached files in /tmp (sbdb.json, cad.json, stars8.json, starnames.json)
are reused when present, so a partial refresh is cheap.
"""
import json
import math
import os
import random
import urllib.request
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "data")
TODAY = date.today()

SBDB_URL = ("https://ssd-api.jpl.nasa.gov/sbdb_query.api"
            "?fields=pdes,name,e,a,i,om,w,ma,epoch,H,diameter,class,pha,first_obs&sb-group=neo")
SENTRY_URL = "https://ssd-api.jpl.nasa.gov/sentry.api"
CONS_LINES_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json"
CONS_NAMES_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json"
CAD_URL = ("https://ssd-api.jpl.nasa.gov/cad.api"
           f"?date-min={TODAY}&date-max={TODAY + timedelta(days=2760)}"
           "&dist-max=0.05&sort=date")
STARS_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.8.json"
NAMES_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/starnames.json"

MAX_PLOTTED = 6000   # all PHAs + brightest of the rest


def load(url, cache):
    path = os.path.join("/tmp", cache)
    if not os.path.exists(path):
        print("downloading", url)
        urllib.request.urlretrieve(url, path)
    with open(path) as f:
        return json.load(f)


def build_neos(sbdb, cad_designations):
    rows = sbdb["data"]
    total_known = sbdb["count"]

    def first_obs_year(s):
        if not s:
            return None
        try:
            parts = (s.split("-") + ["1", "1"])[:3]
            y, m = int(parts[0]), int(parts[1] or 1)
            return round(y + (m - 0.5) / 12, 2)
        except ValueError:
            return None

    def parse(row):
        pdes, name, e, a, i, om, w, ma, epoch, H, diam, cls, pha, fobs = row
        try:
            return {
                "des": pdes, "name": name or None,
                "e": round(float(e), 4), "a": round(float(a), 4),
                "i": round(float(i), 2), "om": round(float(om), 2),
                "w": round(float(w), 2), "ma": round(float(ma), 2),
                "ep": float(epoch), "H": float(H) if H else None,
                "d": round(float(diam), 3) if diam else None,
                "cls": cls, "pha": pha == "Y", "fo": first_obs_year(fobs),
            }
        except (TypeError, ValueError):
            return None   # objects with incomplete orbits

    objs = [o for o in map(parse, rows) if o]
    phas = [o for o in objs if o["pha"]]
    rest = [o for o in objs if not o["pha"] and o["H"] is not None]
    rest.sort(key=lambda o: o["H"])                       # brightest first
    keep = {o["des"]: o for o in phas}
    for o in rest:
        if len(keep) >= MAX_PLOTTED:
            break
        keep.setdefault(o["des"], o)
    by_des = {o["des"]: o for o in objs}
    for des in cad_designations:                           # everything in the CA list
        if des in by_des:
            keep.setdefault(des, by_des[des])

    plotted = list(keep.values())
    # compact: parallel arrays keep the JSON small
    out = {
        "pull": str(TODAY), "known": total_known,
        "phas": len(phas), "plotted": len(plotted),
        "des": [o["des"] for o in plotted],
        "name": [o["name"] for o in plotted],
        "e": [o["e"] for o in plotted], "a": [o["a"] for o in plotted],
        "i": [o["i"] for o in plotted], "om": [o["om"] for o in plotted],
        "w": [o["w"] for o in plotted], "ma": [o["ma"] for o in plotted],
        "ep": [o["ep"] for o in plotted], "H": [o["H"] for o in plotted],
        "d": [o["d"] for o in plotted], "cls": [o["cls"] for o in plotted],
        "pha": [1 if o["pha"] else 0 for o in plotted],
        "fo": [o["fo"] for o in plotted],
    }
    return out


def build_cad(cad):
    rows = []
    for des, _oid, _jd, cd, dist, *_rest, v_rel, _vinf, _sig, h in [
            (r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]) for r in cad["data"]]:
        rows.append([des, cd, round(float(dist), 5), round(float(v_rel), 1),
                     round(float(h), 1) if h else None])
    return {"count": cad["count"], "rows": rows}


def build_stars(stars, names):
    ra, dec, mag, bv, labels = [], [], [], [], []
    for f in stars["features"]:
        lon, lat = f["geometry"]["coordinates"]   # ra in [-180,180], dec deg
        m = f["properties"]["mag"]
        try:
            b = float(f["properties"].get("bv") or 0)
        except ValueError:
            b = 0
        ra.append(round(lon, 2))
        dec.append(round(lat, 2))
        mag.append(round(m, 1))
        bv.append(round(b, 2))
        info = names.get(str(f["id"]))
        if info and info.get("name") and m <= 2.6:
            labels.append([len(ra) - 1, info["name"]])
    return {"count": len(ra), "ra": ra, "dec": dec, "mag": mag, "bv": bv,
            "names": labels}


def build_extras(sentry, cons_lines, cons_names):
    risk = {}
    for o in sentry["data"]:
        try:
            risk[o["des"]] = [float(o["ip"]), float(o["ps_cum"]),
                              int(o["ts_max"]) if o["ts_max"] is not None else None,
                              o["range"]]
        except (TypeError, ValueError, KeyError):
            continue
    lines = []
    for f in cons_lines["features"]:
        for seg in f["geometry"]["coordinates"]:
            lines.append([[round(p[0], 1), round(p[1], 1)] for p in seg])
    names = [[f["properties"]["name"],
              round(f["geometry"]["coordinates"][0], 1),
              round(f["geometry"]["coordinates"][1], 1)]
             for f in cons_names["features"]]
    return {"sentry": risk, "lines": lines, "names": names}


def main():
    sbdb = load(SBDB_URL, "sbdb.json")
    cad = load(CAD_URL, "cad.json")
    stars = load(STARS_URL, "stars8.json")
    names = load(NAMES_URL, "starnames.json")
    sentry = load(SENTRY_URL, "sentry.json")
    cons_l = load(CONS_LINES_URL, "conslines.json")
    cons_n = load(CONS_NAMES_URL, "consnames.json")

    os.makedirs(OUT, exist_ok=True)
    cad_out = build_cad(cad)
    neos_out = build_neos(sbdb, {r[0] for r in cad_out["rows"]})

    for fname, data in [("neos.json", neos_out), ("cad.json", cad_out),
                        ("stars.json", build_stars(stars, names)),
                        ("extras.json", build_extras(sentry, cons_l, cons_n))]:
        path = os.path.join(OUT, fname)
        with open(path, "w") as f:
            json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
        print(f"{fname}: {os.path.getsize(path) // 1024} KB")
    print(f"plotted {neos_out['plotted']} of {neos_out['known']} known NEOs "
          f"({neos_out['phas']} PHAs) · {cad_out['count']} close approaches")


if __name__ == "__main__":
    main()
