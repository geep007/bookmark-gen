# Airbound — Fly a Delivery

An interactive landing page. Press **Take off** and the tailsitter drone spools up
and climbs vertically off the hub roof, then hands you the controls. Fly across
the city and land on one of four delivery sites, marked by orange beacons. Each
landing is scored on how close to the pad centre and how soft the touchdown is.

| Key | Action |
|---|---|
| ↑ / ↓ | speed up / slow down (reverse slowly when stopped) |
| ← / → | turn |
| W / S | climb / descend (W also lifts off again after landing) |
| Space | brake to a hover |
| C | cycle camera: chase / wide / top-down |
| Esc | end the flight |

On touch devices an on-screen pad replaces the keyboard.

## Flight model

`src/flight.ts` is a simplified tailsitter:

- Below 7 m/s the drone hovers nose-up. Between 7 and 16 m/s it pitches over into wing-borne flight.
- Turns are coordinated: bank = atan(v · yaw-rate / g).
- Gusts push it around while hovering.
- Descent is automatically limited close to the ground.
- A landing counts when the drone touches a pad under 3.2 m/s vertical and 3.5 m/s horizontal speed.
- Hitting a wall or the ground faster than that ends the flight.

Tuning is in `src/config.ts`. It uses the same aircraft numbers as
`../blender/airbound_drone_sim.py`.

## Using the FLORA model

Export the **Drone Design Overview** GLB from FLORA and save it as
`public/models/drone.glb`. The page loads it automatically, scales it to the 1.6 m
wingspan and keeps the spinning props. Until then it uses a built-in stand-in. If
the model faces the wrong way, set `modelRotationDeg` in `src/config.ts`. The nose
must point to -Z.

## Run / deploy

```bash
cd airbound-flight
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

To deploy on Vercel, import the repo and set **Root Directory** to `airbound-flight`.
Vercel detects Vite automatically.
