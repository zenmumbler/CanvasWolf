CanvasWolf
==========

An implementation of a Wolf3D-like maze with raycasting and wall-clipping.
Made in 2007, so excuse the somewhat outdated coding style.

Does rendering and clipped player movement inside the maze. Use arrow keys to move and turn.

Issues:

- Depth-shading modes are slow as molasses on Chrome and misrender in Firefox. This may be because of some old canvas feature I used. Works just fine in Safari.
- Movement clipping sometimes blocks you from moving at all if walk into a wall at a slight angle, just rotate a bit more.
- Uses my rather old jquery-like library (included), but can be easily modified to use plain-jane stuff.

(c) 2007 by Arthur Langereis<br>
Textures found on the web at that time, can't remember where.
