# Airbound drone delivery simulation (Blender)

`airbound_drone_sim.py` takes the tailsitter drone model generated in FLORA
(project `prj_ns7ayfjm6bbca430w9jcdezw0x8eay9y`, node **"Drone Design Overview"**,
Tripo H3.1 Multi-View) and animates a full real-world delivery mission in a
procedural city.

| Phase | What happens |
|---|---|
| idle | Drone sits nose-up on the hub rooftop pad, props spool up |
| climb | Vertical take-off to 60 m |
| transition | Pitches over from hover to wing-borne flight, accelerates to 22 m/s |
| cruise | Follows a curved 690 m route; banks via coordinated-turn physics |
| back | Flares and pitches back up to hover over the drop zone |
| descend | Drops to an 18 m hover |
| lower / release / retract | Winch lowers the parcel on a tether (pendulum swing), releases it on the target, reels in |
| depart_climb / depart_tr | Climbs back to cruise altitude, transitions and leaves |

Each phase is a timeline marker. Camera cuts (hub → chase → drop zone → chase)
are bound to markers. Everything is baked to ordinary keyframes, so you can edit it by hand.

## Run it

1. In FLORA, open the **Drone Design Overview** node and download the GLB.
2. Either:
   - **Blender GUI:** Scripting tab → open `airbound_drone_sim.py`, set
     `GLB_PATH = "/path/to/drone.glb"`, then **Run Script**. Press Space to play.
   - **CLI:**
     ```bash
     blender --background --python blender/airbound_drone_sim.py -- \
       --glb ~/Downloads/drone.glb --blend airbound.blend --render renders/airbound.mp4
     ```
     Other flags: `--stills DIR` renders one PNG per phase. `--engine CYCLES` uses Cycles (lower-res preview).

Without a GLB the script builds a stand-in blended-wing drone so the scene still works.

## Tuning

All settings are at the top of the script: wingspan (real-world scale), cruise
altitude/speed, the drop-zone position, route bend, phase durations and prop RPM.
If the FLORA model imports facing the wrong way, set `MODEL_ROTATION_DEG`. The
drone should face nose → +Y, wings → X, top → +Z. Propeller positions are set in
`build_props()` as fractions of the wingspan.

Tested headless with Blender 5.0 (`pip install bpy`).
