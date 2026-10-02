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

Each phase is a timeline marker.

### Cinematic cut

The film is shot as a sequence of cameras, switched by `cut_*` markers on the timeline:

| Shot | Camera |
|---|---|
| 01 Hero pad | Slow 50 mm dolly around the parked drone, shallow depth of field |
| 02 Liftoff | Low 20 mm angle on the roof, zooming to 85 mm as it climbs away |
| 03 Transition | 70 mm side-tracking shot as it pitches over into forward flight |
| 04 Chase | Handheld chase camera over the city |
| 05 Overhead | Straight-down aerial with the drone's nose to the top of frame |
| 06 Arrival | 85 mm, waiting past the drop zone as it flares back into hover |
| 07 Drop ground | Ground-level 18 mm, focused on the parcel |
| 08 Tether | Close on the tether as the parcel is lowered |
| 10 Depart | Wide shot as it climbs out and leaves |

The look:
- Golden-hour sky and a low warm sun, plus a cool fill light.
- Volumetric haze (EEVEE only).
- 2.39:1 widescreen frame (1920×804).
- Motion blur and the AgX Punchy colour look.

Rendering: EEVEE on a GPU is the quick option. Cycles looks better but is slower, and
the script turns the haze off for it. Change `SUN_ELEVATION_DEG`, `HAZE_DENSITY`
and `ASPECT` at the top of the script to restyle the film.
`previews/airbound_cinematic_preview.mp4` is a low-res Cycles preview of the cut
(half resolution, 12 fps, without haze).

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
     Other flags: `--stills DIR` renders one PNG per shot. `--percent 50` renders at half resolution. `--engine CYCLES` uses Cycles (lower-res preview).

Without a GLB the script builds a stand-in blended-wing drone so the scene still works.

## Tuning

All settings are at the top of the script: wingspan (real-world scale), cruise
altitude/speed, the drop-zone position, route bend, phase durations and prop RPM.
If the FLORA model imports facing the wrong way, set `MODEL_ROTATION_DEG`. The
drone should face nose → +Y, wings → X, top → +Z. Propeller positions are set in
`build_props()` as fractions of the wingspan.

Tested headless with Blender 5.0 (`pip install bpy`).
