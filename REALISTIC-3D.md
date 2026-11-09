# Making the 3D map look like the real house

Today the 3D view is a cut-away of extruded room boxes from the 2D plan. Looking real needs measured geometry and surface appearance, not more drawing code. What each part needs, and what Tom supplies:

## Needed from Tom

1. Floor plan dimensions per floor. The 2D plan is a sketch (rooms snap to 10 units, 50 units = 1 m), so it needs checking against a tape or a laser measure. Wall thickness too, and which walls are external.
2. Ceiling height per floor, floor-to-floor height and the thickness of the first-floor slab. Roof shape: pitch, ridge direction, overhang, dormers or flat sections.
3. Openings: for each door and window, which wall, position along it, width, height and sill height. Window and door style (sash, casement, French doors, garage door).
4. Exterior photos: one straight-on photo per elevation (front, back, both sides) taken from as far back as possible, plus the roof from any upstairs window. These give brick or render colour, trim, window frames and roof tiles.
5. Interior photos: one wide shot per room from a corner, floor and wall close-ups, and the stairs. These give floor material, wall colour and how the rooms flow.
6. Fixed fittings that read as "the house": stairs position, fireplace, kitchen units, bath and toilet, radiators.
7. Solar array: panel count, roof face, orientation and tilt. It currently floats above the first floor as a placeholder.

## Approach once those exist

- Measurements go in as real wall, window and door geometry and replace the extruded rooms. Rooms keep their HA area links, so sensor and device layers carry over unchanged.
- Photos become textures (brick, render, roof tile, flooring, wall colour) mapped onto the new geometry. A true textured model needs a real 3D engine (three.js) instead of the current canvas drawing. That also gives free orbit and zoom.
- Fastest accurate route: Tom walks each floor with a phone LiDAR scan (Polycam, Apple RoomPlan or the Android equivalent) and exports a glTF or OBJ per room. Those can be dropped in directly, so this replaces steps 1 to 3 and part of 5 with one scan per floor.
- Furniture and fittings are not worth modelling beyond the few big items in point 6.

## Suggested order

1. Tom takes the scan or measurements (about an hour for the house).
2. Tom takes the exterior and interior photos.
3. Switch the 3D view to a real 3D engine with the scanned shell and photo textures.
4. Re-place sensors, lights and plugs on the real model in a 3D edit mode.
