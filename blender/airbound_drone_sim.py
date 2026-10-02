"""
Airbound tailsitter delivery drone -- real-world delivery simulation for Blender.

Imports the drone model generated in FLORA (GLB) and builds a full, keyframed
delivery mission in a procedural city:

    1. Idle on the hub rooftop, props spin up
    2. Vertical take-off (tailsitter, nose up)
    3. Transition: pitches over from hover into wing-borne forward flight
    4. Cruise along a curved route with coordinated-turn banking
    5. Back-transition to hover over the drop zone, descend
    6. Winch lowers the parcel on a tether (pendulum swing), release, retract
    7. Climb, transition again and depart

The motion is computed with a small kinematic flight model (speed profile,
coordinated-turn bank = atan(v^2 * curvature / g), gust noise in hover,
damped pendulum for the tethered parcel) and baked to keyframes, so the
result plays back in real time and can be edited like any animation.

Usage
-----
Blender GUI: open the Scripting workspace, load this file, set GLB_PATH below
(or leave it empty to get a stand-in drone), press Run Script.

Command line:
    blender --background --python airbound_drone_sim.py -- \
        --glb /path/to/drone.glb [--render /path/out.mp4] [--blend /path/scene.blend]

Tested with Blender 4.2+ (bpy module).
"""

import math
import os
import random
import sys

import bpy
import bmesh  # noqa: E402  (bmesh needs bpy loaded first)
from mathutils import Euler, Matrix, Vector, noise

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

GLB_PATH = ""                # FLORA export, e.g. "~/Downloads/drone.glb"
WINGSPAN_M = 1.6             # real-world span the model is scaled to
MODEL_ROTATION_DEG = (0, 0, 0)  # extra XYZ rotation if the GLB imports facing the wrong way
# After correction the drone must face +Y (nose), wings along X, top along +Z.

FPS = 24
CRUISE_ALT_M = 60.0          # above ground
CRUISE_SPEED_MS = 22.0       # ~80 km/h
HUB_HEIGHT_M = 12.0          # rooftop pad height at the hub
HOVER_DROP_ALT_M = 18.0      # hover height above the drop zone while winching
ROUTE_END = Vector((620.0, 260.0))  # drop zone, metres from the hub
ROUTE_BEND = 140.0           # lateral offset of the route curve (gives a banked turn)
G = 9.81

# phase durations (seconds)
T_IDLE = 2.0
T_CLIMB = 6.0
T_TRANSITION = 4.0
T_DESCEND = 5.0
T_LOWER = 6.0
T_RELEASE = 1.0
T_RETRACT = 3.0
T_DEPART_CLIMB = 4.0
T_DEPART = 6.0

PROP_RPM = 4200

# cinematic look
SUN_ELEVATION_DEG = 11       # golden hour
SUN_ROTATION_DEG = 205
ASPECT = (1920, 804)         # 2.39:1 widescreen
HAZE_DENSITY = 0.0009        # world volume, EEVEE only (too slow in Cycles)
SEED = 7


def parse_cli():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opts = {"glb": GLB_PATH, "render": "", "blend": "", "stills": "", "engine": "", "percent": ""}
    i = 0
    while i < len(argv):
        key = argv[i].lstrip("-")
        if key in opts and i + 1 < len(argv):
            opts[key] = argv[i + 1]
            i += 2
        else:
            i += 1
    return opts


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def smoothstep(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def material(name, color, rough=0.6, metal=0.0, emit=None, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        sock = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        sock.default_value = (*emit, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 4.0
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
        elif hasattr(mat, "blend_method"):
            mat.blend_method = "BLEND"
    return mat


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def mesh_object(name, build, mat=None, loc=(0, 0, 0)):
    """Create a mesh object from a bmesh builder without bpy.ops, so the
    script works from the Text Editor as well as from the command line."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    if mat:
        me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    return link(ob)


def trs(loc=(0, 0, 0), rot=(0, 0, 0), size=(1, 1, 1)):
    return (Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4()
            @ Matrix.Diagonal(Vector((*size, 1.0))))


def cube(bm, **kw):
    bmesh.ops.create_cube(bm, size=1.0, matrix=trs(**kw))


def cylinder(bm, radius, depth, segments=24, **kw):
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius,
                          radius2=radius, depth=depth, matrix=trs(**kw))


def sphere(bm, **kw):
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.5, matrix=trs(**kw))


def torus(bm, major, minor, seg=48, ring=12):
    verts = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        row = []
        for j in range(ring):
            b = 2 * math.pi * j / ring
            r = major + minor * math.cos(b)
            row.append(bm.verts.new((r * math.cos(a), r * math.sin(a), minor * math.sin(b))))
        verts.append(row)
    for i in range(seg):
        for j in range(ring):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j],
                          verts[(i + 1) % seg][(j + 1) % ring], verts[i][(j + 1) % ring]))


def add_box(name, size, loc, mat):
    return mesh_object(name, lambda bm: cube(bm, size=size), mat, loc)


def reset_scene():
    scene = bpy.context.scene
    for ob in list(scene.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras,
                 bpy.data.lights, bpy.data.actions, bpy.data.worlds):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)
    scene.timeline_markers.clear()
    scene.render.fps = FPS
    scene.unit_settings.system = "METRIC"
    return scene


# --------------------------------------------------------------------------
# Drone
# --------------------------------------------------------------------------

def build_standin_drone(mat):
    """Blended-wing-body tailsitter built from primitives (used when no GLB)."""
    def build(bm):
        sphere(bm, size=(0.32, 0.9, 0.22))
        for side in (-1, 1):
            cube(bm, loc=(side * 0.55, -0.05, -0.02),
                 rot=(0, side * math.radians(-8), side * math.radians(-18)),
                 size=(0.85, 0.32, 0.03))
            cube(bm, loc=(side * 0.12, -0.25, -0.18), size=(0.02, 0.28, 0.2))
            cylinder(bm, 0.025, 0.14, 12, loc=(side * 0.42, 0.2, 0.08))
    return mesh_object("Drone_Model", build, mat)


def world_bounds(objs):
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def import_drone(glb_path, mat_fallback):
    path = os.path.expanduser(glb_path) if glb_path else ""
    if not (path and os.path.exists(path)):
        if glb_path:
            print(f"[airbound] GLB not found at {glb_path}; using stand-in drone")
        return build_standin_drone(mat_fallback)

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    print(f"[airbound] imported {glb_path} ({len(meshes)} meshes)")

    # Drone_Model (clean frame the props attach to) > Drone_Fix (orientation
    # and scale correction) > imported GLB hierarchy
    model = link(bpy.data.objects.new("Drone_Model", None))
    fix = link(bpy.data.objects.new("Drone_Fix", None))
    for o in new:
        if o.parent is None:
            o.parent = fix
    fix.rotation_euler = Euler([math.radians(a) for a in MODEL_ROTATION_DEG])

    # wings must lie along X: if the model is wider along Y, turn it 90 degrees
    lo, hi = world_bounds(meshes)
    if (hi.y - lo.y) > (hi.x - lo.x) * 1.15:
        fix.rotation_euler.z += math.radians(90)
        lo, hi = world_bounds(meshes)

    # centre on the bounding box and scale to the real wingspan
    s = WINGSPAN_M / max(hi.x - lo.x, 1e-6)
    fix.scale = (s, s, s)
    fix.location = -(lo + hi) / 2 * s
    fix.parent = model
    return model


def build_props(parent, mat_blade, mat_disc, frames):
    """Two tractor propellers above the leading edge, spinning about +Y."""
    span = WINGSPAN_M
    props = []
    for i, side in enumerate((-1, 1)):
        loc = (side * 0.27 * span, 0.22 * span, 0.06 * span)
        blade = mesh_object(f"Prop_{'LR'[i]}",
                            lambda bm: cube(bm, size=(0.22 * span, 0.004, 0.018 * span)),
                            mat_blade, loc)
        blade.parent = parent
        blade.rotation_mode = "XYZ"
        # motion-blur disc
        disc = mesh_object(f"PropDisc_{'LR'[i]}",
                           lambda bm: cylinder(bm, 0.11 * span, 0.002, 32,
                                               rot=(math.radians(90), 0, 0)),
                           mat_disc, loc)
        disc.parent = parent
        props.append(blade)

    spin_per_frame = PROP_RPM / 60.0 / FPS * 2 * math.pi
    spin_per_frame = spin_per_frame % (2 * math.pi) or 0.9  # avoid strobing
    spin_per_frame = min(spin_per_frame, 1.1)
    for k, blade in enumerate(props):
        direction = 1 if k == 0 else -1  # counter-rotating
        angle = 0.0
        for f in range(1, frames + 1):
            t = (f - 1) / FPS
            spool = smoothstep(t / T_IDLE)
            angle += direction * spin_per_frame * spool
            if f % 2 == 1 or f == frames:
                blade.rotation_euler = (0, angle, 0)
                blade.keyframe_insert("rotation_euler", index=1, frame=f)
        set_linear(blade)
    return props


def set_linear(ob):
    if not ob.animation_data or not ob.animation_data.action:
        return
    action = ob.animation_data.action
    curves = getattr(action, "fcurves", None)
    if curves is None:  # Blender 5 layered actions
        curves = [fc for layer in action.layers for strip in layer.strips
                  for bag in strip.channelbags for fc in bag.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


# --------------------------------------------------------------------------
# Environment
# --------------------------------------------------------------------------

def build_world(scene, haze=True):
    world = bpy.data.worlds.new("Sky")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes["Background"]
    try:
        sky = nt.nodes.new("ShaderNodeTexSky")
        for t in ("NISHITA", "MULTIPLE_SCATTERING", "SINGLE_SCATTERING"):
            try:
                sky.sky_type = t
                break
            except TypeError:
                continue
        sky.sun_elevation = math.radians(SUN_ELEVATION_DEG)
        sky.sun_rotation = math.radians(SUN_ROTATION_DEG)
        if hasattr(sky, "air_density"):
            sky.air_density = 1.4
        if hasattr(sky, "dust_density"):
            sky.dust_density = 2.5
        nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
        bg.inputs["Strength"].default_value = 0.25
    except Exception:
        bg.inputs["Color"].default_value = (0.75, 0.62, 0.5, 1)
    if haze and HAZE_DENSITY > 0:
        vol = nt.nodes.new("ShaderNodeVolumePrincipled")
        vol.inputs["Density"].default_value = HAZE_DENSITY
        vol.inputs["Color"].default_value = (0.95, 0.82, 0.68, 1)
        vol.inputs["Anisotropy"].default_value = 0.6
        out = nt.nodes["World Output"]
        nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])

    # warm low key light aligned with the sky's sun, plus a cool fill
    sun = link(bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")))
    sun.rotation_euler = (math.radians(90 - SUN_ELEVATION_DEG), 0,
                          math.radians(SUN_ROTATION_DEG + 180))
    sun.data.energy = 3.4
    sun.data.color = (1.0, 0.78, 0.56)
    sun.data.angle = math.radians(2.0)
    fill = link(bpy.data.objects.new("Sky_Fill", bpy.data.lights.new("Sky_Fill", "SUN")))
    fill.rotation_euler = (math.radians(20), 0, math.radians(SUN_ROTATION_DEG))
    fill.data.energy = 0.35
    fill.data.color = (0.62, 0.74, 1.0)
    fill.data.use_shadow = False


def build_city(route):
    rng = random.Random(SEED)
    m_ground = material("Ground", (0.18, 0.2, 0.17), rough=0.95)
    m_road = material("Road", (0.06, 0.06, 0.07), rough=0.9)
    m_bld = [material(f"Building_{i}", c, rough=0.8) for i, c in enumerate(
        [(0.72, 0.7, 0.66), (0.55, 0.57, 0.6), (0.82, 0.78, 0.7), (0.4, 0.42, 0.45)])]
    m_pad = material("Pad", (0.95, 0.42, 0.08), rough=0.5)
    m_lawn = material("Lawn", (0.16, 0.38, 0.12), rough=0.95)

    add_box("Ground", (3000, 3000, 0.02), (300, 120, -0.01), m_ground)

    block, street = 46.0, 14.0
    pitch = block + street
    start, end = Vector((0, 0)), ROUTE_END
    for gx in range(-8, 18):
        for gy in range(-8, 14):
            cx, cy = gx * pitch, gy * pitch
            c = Vector((cx, cy))
            if (c - start).length < 40 or (c - end).length < 55:
                continue
            for sx in (-1, 1):
                for sy in (-1, 1):
                    if rng.random() < 0.15:
                        continue
                    w = rng.uniform(12, 20)
                    d = rng.uniform(12, 20)
                    dist = min((c - p).length for p in route[::8])
                    tall = 1.0 if dist > 150 else 0.6
                    h = rng.choice([rng.uniform(6, 14), rng.uniform(10, 30) * tall,
                                    rng.uniform(25, 45) * tall])
                    add_box("Building", (w, d, h),
                            (cx + sx * block / 4, cy + sy * block / 4, h / 2),
                            rng.choice(m_bld))
    for gx in range(-8, 19):
        add_box("Road", (street, pitch * 22, 0.05), (gx * pitch - pitch / 2, 3 * pitch, 0.02), m_road)
    for gy in range(-8, 15):
        add_box("Road", (pitch * 26, street, 0.05), (5 * pitch, gy * pitch - pitch / 2, 0.03), m_road)

    # hub building with rooftop pad
    add_box("Hub", (24, 24, HUB_HEIGHT_M), (0, 0, HUB_HEIGHT_M / 2), m_bld[1])
    mesh_object("Hub_Pad", lambda bm: cylinder(bm, 3.0, 0.1, 48), m_pad,
                (0, 0, HUB_HEIGHT_M + 0.05))

    # drop zone: garden with a target marker
    add_box("DropZone_Lawn", (40, 40, 0.1), (end.x, end.y, 0.05), m_lawn)
    mesh_object("DropZone_Target", lambda bm: torus(bm, 1.6, 0.12), m_pad,
                (end.x, end.y, 0.15))
    add_box("House", (10, 8, 6), (end.x - 14, end.y + 10, 3), m_bld[2])


# --------------------------------------------------------------------------
# Flight model
# --------------------------------------------------------------------------

def make_route(samples=400):
    """Cubic Bezier from hub to drop zone; returns arclength-sampled points."""
    p0 = Vector((0.0, 0.0))
    p3 = ROUTE_END.copy()
    d = (p3 - p0)
    n = Vector((-d.y, d.x)).normalized()
    p1 = p0 + d * 0.3 + n * ROUTE_BEND
    p2 = p0 + d * 0.7 - n * ROUTE_BEND * 0.6
    pts = []
    for i in range(samples + 1):
        u = i / samples
        pts.append((1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1
                   + 3 * (1 - u) * u ** 2 * p2 + u ** 3 * p3)
    cum = [0.0]
    for a, b in zip(pts, pts[1:]):
        cum.append(cum[-1] + (b - a).length)
    return pts, cum


def route_at(pts, cum, s):
    s = max(0.0, min(cum[-1], s))
    lo, hi = 0, len(cum) - 1
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if cum[mid] <= s:
            lo = mid
        else:
            hi = mid
    seg = cum[hi] - cum[lo] or 1e-6
    f = (s - cum[lo]) / seg
    p = pts[lo].lerp(pts[hi], f)
    tangent = (pts[hi] - pts[lo]).normalized()
    # curvature from neighbouring tangents (signed, +left)
    i0, i2 = max(lo - 3, 0), min(hi + 3, len(pts) - 1)
    t0 = (pts[min(i0 + 1, len(pts) - 1)] - pts[i0]).normalized()
    t2 = (pts[i2] - pts[max(i2 - 1, 0)]).normalized()
    ds = max(cum[i2] - cum[i0], 1e-6)
    cross = t0.x * t2.y - t0.y * t2.x
    k = math.asin(max(-1, min(1, cross))) / ds
    return p, tangent, k


def simulate(pts, cum):
    """Return per-frame state dicts: pos, yaw, pitch, roll, winch, released."""
    L = cum[-1]
    vc = CRUISE_SPEED_MS
    # distance covered during each transition: mean speed vc/2
    d_tr = vc * T_TRANSITION / 2
    t_cruise = max(0.0, (L - 2 * d_tr) / vc)

    t1 = T_IDLE
    t2 = t1 + T_CLIMB
    t3 = t2 + T_TRANSITION
    t4 = t3 + t_cruise
    t5 = t4 + T_TRANSITION
    t6 = t5 + T_DESCEND
    t7 = t6 + T_LOWER
    t8 = t7 + T_RELEASE
    t9 = t8 + T_RETRACT
    t10 = t9 + T_DEPART_CLIMB
    t11 = t10 + T_TRANSITION
    t12 = t11 + T_DEPART
    phases = dict(idle=t1, climb=t2, transition=t3, cruise=t4, back=t5,
                  descend=t6, lower=t7, release=t8, retract=t9,
                  depart_climb=t10, depart_tr=t11, end=t12)

    end_p, end_tan, _ = route_at(pts, cum, L)
    hover_pitch = math.radians(90)
    cruise_pitch = math.radians(4)
    tether_max = HOVER_DROP_ALT_M - 0.4
    states = []
    frames = int(math.ceil(t12 * FPS)) + 1
    s_depart = 0.0
    for f in range(frames):
        t = f / FPS
        winch, released = 0.0, t >= t8
        pitch, roll = hover_pitch, 0.0
        if t < t1:
            s, z = 0.0, HUB_HEIGHT_M + 0.35
        elif t < t2:
            s = 0.0
            z = HUB_HEIGHT_M + 0.35 + (CRUISE_ALT_M - HUB_HEIGHT_M) * smoothstep((t - t1) / T_CLIMB)
        elif t < t3:
            u = (t - t2) / T_TRANSITION
            s = vc * T_TRANSITION * (u * u / 2)          # v ramps 0 -> vc
            z = CRUISE_ALT_M + 3.0 * math.sin(math.pi * u)  # small balloon during transition
            pitch = hover_pitch + (cruise_pitch - hover_pitch) * smoothstep(u * 1.15)
        elif t < t4:
            s = d_tr + vc * (t - t3)
            z = CRUISE_ALT_M
            pitch = cruise_pitch
        elif t < t5:
            u = (t - t4) / T_TRANSITION
            s = L - d_tr + vc * T_TRANSITION * (u - u * u / 2)  # v ramps vc -> 0
            z = CRUISE_ALT_M + 4.0 * math.sin(math.pi * u)     # flare
            pitch = cruise_pitch + (hover_pitch - cruise_pitch) * smoothstep(u * 1.1)
        elif t < t6:
            s = L
            z = CRUISE_ALT_M + (HOVER_DROP_ALT_M - CRUISE_ALT_M) * smoothstep((t - t5) / T_DESCEND)
        elif t < t9:
            s, z = L, HOVER_DROP_ALT_M
            if t < t7:
                winch = smoothstep((t - t6) / T_LOWER)
            elif t < t8:
                winch = 1.0
            else:
                winch = 1.0 - smoothstep((t - t8) / T_RETRACT)
        elif t < t10:
            s = L
            z = HOVER_DROP_ALT_M + (CRUISE_ALT_M - HOVER_DROP_ALT_M) * smoothstep((t - t9) / T_DEPART_CLIMB)
        else:
            s = L
            u = min((t - t10) / T_TRANSITION, 1.0)
            if t < t11:
                s_depart = vc * T_TRANSITION * (u * u / 2)
                pitch = hover_pitch + (cruise_pitch - hover_pitch) * smoothstep(u * 1.15)
            else:
                s_depart = vc * T_TRANSITION / 2 + vc * (t - t11)
                pitch = cruise_pitch
            z = CRUISE_ALT_M + 3.0 * math.sin(math.pi * u)

        if t >= t10:
            p2 = end_p + end_tan * s_depart
            tan, k, v = end_tan, 0.0, vc
        else:
            p2, tan, k = route_at(pts, cum, s)
            v = 0.0
            if t2 <= t < t3:
                v = vc * (t - t2) / T_TRANSITION
            elif t3 <= t < t4:
                v = vc
            elif t4 <= t < t5:
                v = vc * (1 - (t - t4) / T_TRANSITION)

        # coordinated turn: bank so lift balances centripetal force
        if pitch < math.radians(45):
            roll = -math.atan(v * v * k / G)
        # gusts while hovering (stronger near the ground / during winching)
        hover_w = 1.0 if pitch > math.radians(60) and t > t1 else 0.0
        gx = noise.noise(Vector((t * 0.6, 0.0, 1.3))) * 0.35 * hover_w
        gy = noise.noise(Vector((0.0, t * 0.6, 4.1))) * 0.35 * hover_w
        gz = noise.noise(Vector((2.2, 7.7, t * 0.5))) * 0.15 * hover_w
        pos = Vector((p2.x + gx, p2.y + gy, z + gz))
        yaw = math.atan2(-tan.x, tan.y)
        roll += gx * 0.25
        states.append(dict(t=t, pos=pos, yaw=yaw, pitch=pitch, roll=roll,
                           winch=winch * tether_max, released=released))
    return states, phases


# --------------------------------------------------------------------------
# Animation
# --------------------------------------------------------------------------

def attitude_matrix(st):
    # model frame: nose +Y, wings X, top +Z. Pitch about X, roll about Y, yaw about Z.
    return Euler((st["pitch"], st["roll"], st["yaw"]), "YXZ").to_matrix()


def animate(scene, model, states, phases):
    rig = bpy.data.objects.new("Drone_Rig", None)
    scene.collection.objects.link(rig)
    rig.empty_display_size = WINGSPAN_M
    rig.rotation_mode = "YXZ"
    model.parent = rig

    m_parcel = material("Parcel", (0.62, 0.45, 0.28), rough=0.85)
    m_tether = material("Tether", (0.9, 0.9, 0.9), rough=0.5)
    parcel = add_box("Parcel", (0.22, 0.22, 0.16), (0, 0, 0), m_parcel)
    # origin at the top so scale.z = length
    tether = mesh_object("Tether", lambda bm: cylinder(bm, 0.006, 1.0, 8, loc=(0, 0, -0.5)),
                         m_tether)

    belly = Vector((0, -0.05 * WINGSPAN_M, -0.12 * WINGSPAN_M))  # parcel bay, model frame
    swing = Vector((0.0, 0.0))
    swing_v = Vector((0.0, 0.0))
    prev_anchor = None
    parcel_ground = None
    for i, st in enumerate(states):
        f = i + 1
        rot = attitude_matrix(st)
        rig.location = st["pos"]
        rig.rotation_euler = Euler((st["pitch"], st["roll"], st["yaw"]), "YXZ")
        rig.keyframe_insert("location", frame=f)
        rig.keyframe_insert("rotation_euler", frame=f)

        anchor = st["pos"] + rot @ belly
        length = st["winch"]
        if st["released"] and parcel_ground is None:
            parcel_ground = Vector((anchor.x + swing.x, anchor.y + swing.y, 0.08))
        if parcel_ground is not None:
            parcel.location = parcel_ground
            parcel.rotation_euler = (0, 0, st["yaw"])
        elif length > 0.05:
            # damped pendulum: the parcel lags behind anchor motion
            dt = 1.0 / FPS
            if prev_anchor is not None:
                acc = -(anchor - prev_anchor).xy / dt * 0.8
            else:
                acc = Vector((0, 0))
            omega2 = G / max(length, 0.5)
            swing_v += (acc * dt * 2.0 - swing * omega2 * dt - swing_v * 0.9 * dt)
            swing += swing_v * dt
            swing.x = max(-1.5, min(1.5, swing.x))
            swing.y = max(-1.5, min(1.5, swing.y))
            parcel.location = anchor + Vector((swing.x, swing.y, -length))
            parcel.rotation_euler = (0, 0, st["yaw"])
        else:
            parcel.location = anchor
            parcel.rotation_euler = rot.to_euler("XYZ")
        prev_anchor = anchor
        parcel.keyframe_insert("location", frame=f)
        parcel.keyframe_insert("rotation_euler", frame=f)

        # tether from anchor down to the parcel (or retracting after release)
        top = anchor
        bottom = parcel.location if parcel_ground is None else anchor - Vector((0, 0, length))
        vec = bottom - top
        tether.location = top
        tether.rotation_euler = vec.to_track_quat("-Z", "Y").to_euler()
        tether.scale = (1, 1, max(vec.length, 0.001))
        tether.hide_render = length < 0.05
        tether.hide_viewport = length < 0.05
        for path in ("location", "rotation_euler", "scale", "hide_render", "hide_viewport"):
            tether.keyframe_insert(path, frame=f)

    scene.frame_start = 1
    scene.frame_end = len(states)
    for name, t in phases.items():
        scene.timeline_markers.new(name, frame=int(t * FPS) + 1)
    return rig


def build_cameras(scene, rig, states, phases):
    """Cinematic shot list. Each shot is its own camera, cut in with markers."""
    parcel = bpy.data.objects["Parcel"]
    n = len(states)
    end = ROUTE_END
    end_tan = (Vector(states[int(phases["cruise"] * FPS)]["pos"].xy)
               - Vector(states[int(phases["cruise"] * FPS) - FPS]["pos"].xy)).normalized()
    end_side = Vector((end_tan.y, -end_tan.x))

    def frames(t0, t1):
        return range(max(int(t0 * FPS), 0), min(int(t1 * FPS) + 2, n))

    def make_cam(name, lens, track=None, focus=None, fstop=2.8):
        cam = link(bpy.data.objects.new(name, bpy.data.cameras.new(name)))
        cam.data.lens = lens
        cam.data.sensor_width = 36
        cam.data.clip_end = 3000
        if track is not None:
            c = cam.constraints.new("TRACK_TO")
            c.target = track
            c.track_axis = "TRACK_NEGATIVE_Z"
            c.up_axis = "UP_Y"
        if focus is not None:
            cam.data.dof.use_dof = True
            cam.data.dof.focus_object = focus
            cam.data.dof.aperture_fstop = fstop
        return cam

    def handheld(i, amount):
        t = i / FPS
        return Vector((noise.noise(Vector((t * 0.7, 3.1, 0.0))),
                       noise.noise(Vector((5.3, t * 0.7, 0.0))),
                       noise.noise(Vector((0.0, 9.7, t * 0.6))))) * amount

    def bake(cam, rng, target_fn, smooth=1.0, shake=0.0):
        p = None
        for i in rng:
            want = target_fn(i, states[i])
            p = want if p is None else p.lerp(want, smooth)
            cam.location = p + handheld(i, shake)
            cam.keyframe_insert("location", frame=i + 1)

    def fwd_side(st):
        fwd = Vector((-math.sin(st["yaw"]), math.cos(st["yaw"]), 0))
        side = Vector((math.cos(st["yaw"]), math.sin(st["yaw"]), 0))
        return fwd, side

    shots = []
    pad = Vector((0, 0, HUB_HEIGHT_M))

    # 1. slow dolly around the parked drone
    cam = make_cam("Shot01_HeroPad", 50, rig, rig, 2.0)
    t0, t1 = 0.0, 3.5

    def hero(i, st):
        u = smoothstep(i / FPS / t1)
        a = math.radians(225 + 35 * u)
        r = 7.5 - 2.5 * u
        return pad + Vector((math.cos(a) * r, math.sin(a) * r, 0.9 - 0.2 * u))
    bake(cam, frames(t0, t1), hero, shake=0.02)
    shots.append((t0, cam))

    # 2. low angle on the roof looking up as it lifts off
    cam = make_cam("Shot02_Liftoff", 20, rig, rig, 4.0)
    cam.location = pad + Vector((2.6, -3.2, 0.25))
    for t, lens in ((3.5, 20), (5.0, 24), (8.0, 85)):  # zoom in as it climbs away
        cam.data.lens = lens
        cam.data.keyframe_insert("lens", frame=int(t * FPS) + 1)
    shots.append((3.5, cam))

    # 3. long-lens side tracking through the transition
    cam = make_cam("Shot03_Transition", 70, rig, rig, 4.0)
    bake(cam, frames(8.0, 14.0),
         lambda i, st: st["pos"] + fwd_side(st)[1] * 16 - fwd_side(st)[0] * 4 + Vector((0, 0, -2)),
         smooth=0.08, shake=0.05)
    shots.append((8.0, cam))

    # 4. chase
    cam = make_cam("Shot04_Chase", 35, rig, rig, 5.6)
    bake(cam, frames(14.0, 24.0),
         lambda i, st: st["pos"] - fwd_side(st)[0] * 7 + fwd_side(st)[1] * 2.5 + Vector((0, 0, 2.2)),
         smooth=0.12, shake=0.12)
    shots.append((14.0, cam))

    # 5. straight-down aerial, drone's nose to the top of frame
    cam = make_cam("Shot05_Overhead", 50)
    p = None
    for i in frames(24.0, 31.0):
        st = states[i]
        want = st["pos"] + Vector((0, 0, 24))
        p = want if p is None else p.lerp(want, 0.6)
        cam.location = p
        cam.rotation_euler = (0, 0, st["yaw"] + math.radians(8) * math.sin(i / FPS * 0.4))
        cam.keyframe_insert("location", frame=i + 1)
        cam.keyframe_insert("rotation_euler", frame=i + 1)
    shots.append((24.0, cam))

    # 6. waiting ahead of the drop zone as it arrives and flares to hover
    cam = make_cam("Shot06_Arrival", 85, rig, rig, 4.0)
    cam.location = Vector((end.x, end.y, 0)) + (end_tan * 16 + end_side * 7).to_3d() + Vector((0, 0, 48))
    shots.append((31.0, cam))

    # 7/9. ground cam at the drop zone, focus on the parcel
    focus = link(bpy.data.objects.new("DropZone_Focus", None))
    focus.location = (end.x, end.y, HOVER_DROP_ALT_M * 0.55)
    ground = make_cam("Shot07_DropGround", 18, focus, parcel, 5.6)
    ground.location = (end.x + 12, end.y - 16, 2.5)
    shots.append((phases["descend"], ground))

    # 8. close on the tether as the parcel goes down
    cam = make_cam("Shot08_Tether", 40, parcel, parcel, 2.8)
    bake(cam, frames(50.0, 54.2),
         lambda i, st: st["pos"] + fwd_side(st)[1] * 3 - fwd_side(st)[0] * 1.5 + Vector((0, 0, 1.2)),
         smooth=0.2, shake=0.03)
    shots.append((50.0, cam))
    shots.append((54.2, ground))

    # 10. wide departure, drone climbs out and away
    cam = make_cam("Shot10_Depart", 40, rig, rig, 8.0)
    cam.location = Vector((end.x, end.y, 0)) + (-end_tan * 14 - end_side * 9).to_3d() + Vector((0, 0, 4))
    shots.append((phases["retract"], cam))

    for t, c in shots:
        m = scene.timeline_markers.new(f"cut_{c.name}", frame=int(t * FPS) + 1)
        m.camera = c
    scene.camera = shots[0][1]


def setup_render(scene, out_path):
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.render.resolution_x, scene.render.resolution_y = ASPECT
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = 0.5
    try:
        scene.view_settings.view_transform = "AgX"
    except TypeError:
        scene.view_settings.view_transform = "Filmic"
    for look in ("AgX - Punchy", "Punchy", "AgX - Medium High Contrast", "Medium High Contrast"):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = -0.2
    for attr, val in (("use_raytracing", True), ("use_shadows", True),
                      ("volumetric_tile_size", "8"), ("volumetric_end", 1500.0)):
        try:
            setattr(scene.eevee, attr, val)
        except (AttributeError, TypeError):
            pass
    if out_path:
        scene.render.filepath = out_path
        try:
            scene.render.image_settings.media_type = "VIDEO"  # Blender 5+
        except AttributeError:
            pass
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "HIGH"


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    opts = parse_cli()
    scene = reset_scene()
    build_world(scene, haze=opts["engine"] != "CYCLES")

    pts, cum = make_route()
    build_city(pts)

    m_carbon = material("Carbon_Fallback", (0.04, 0.04, 0.045), rough=0.35, metal=0.2)
    model = import_drone(opts["glb"], m_carbon)

    states, phases = simulate(pts, cum)
    rig = animate(scene, model, states, phases)
    build_props(model, material("PropBlade", (0.05, 0.05, 0.05), rough=0.4),
                material("PropDisc", (0.1, 0.1, 0.1), alpha=0.15), len(states))
    build_cameras(scene, rig, states, phases)
    setup_render(scene, opts["render"])

    print("[airbound] mission timeline (s): " +
          ", ".join(f"{k}={v:.1f}" for k, v in phases.items()))
    print(f"[airbound] route length {cum[-1]:.0f} m, {len(states)} frames @ {FPS} fps")

    if opts["percent"]:
        scene.render.resolution_percentage = int(opts["percent"])
    if opts["engine"]:
        scene.render.engine = opts["engine"]
        if opts["engine"] == "CYCLES":
            scene.cycles.samples = 24
            scene.render.resolution_percentage = 50
    if opts["blend"]:
        os.makedirs(os.path.dirname(os.path.abspath(opts["blend"])), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(opts["blend"]))
    if opts["stills"]:
        os.makedirs(opts["stills"], exist_ok=True)
        cuts = sorted((m.frame, m.name) for m in scene.timeline_markers if m.camera)
        for k, (start, name) in enumerate(cuts):
            stop = cuts[k + 1][0] if k + 1 < len(cuts) else scene.frame_end
            f = min((start + stop) // 2, scene.frame_end)
            scene.frame_set(max(f, 1))
            scene.render.image_settings.file_format = "PNG"
            scene.render.filepath = os.path.join(opts["stills"], f"{f:05d}_{name}.png")
            bpy.ops.render.render(write_still=True)
    if opts["render"]:
        bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    main()
