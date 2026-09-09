# Third-party software

## Bloub reference Rig

Source: https://github.com/jeremy-prt/bloub

Commit: b4bb3c1b5f93c7b87a2e8d620f667c4093d97749

The files in packages/rig-bloub/src/vendor preserve upstream character calculations and measured data, with .js import extensions for Node ESM and a Mofli-added `BotEngine.fork()` method to copy controller state with an independent point scratch buffer. Mofli converts the output into its own Frame/resource protocol; no Vue component is included. This reference integration was added at the user’s explicit request to reproduce Bloub. Other Mofli modules remain independently implemented. The upstream README distinguishes the code license from the imitated avatar design; this reference is not Mofli’s original mascot.

MIT License

Copyright (c) 2026 Jérémy Perret

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


Mofli precision correction: the alert tear path retains six decimal places in normalized coordinates before its 100× SVG transform. Upstream rounded it to two decimals, magnifying quantization into visible jagged edges. Geometry and motion are otherwise unchanged. Reference comparisons use this locally corrected vendor source; the dedicated precision regression compares against unrounded geometric coordinates.


Core radial extraction: packages/core/src/radial.ts adapts Bloub blend/toPoints/closedPath into variable-resolution utilities. Both Bloub and cat-head use this module. The MIT license above applies to that derived module as well; it is not claimed as original Mofli code.

Spherical face extraction: packages/core/src/spherical-face.ts and face-math.ts retain Bloub's calibrated eyePoses, liveliness and blinkScale implementations and math helpers under the MIT license above. The Bloub reference rig and cat-head rig share this implementation. No independent authorship is claimed for these extracted functions or calibration constants.
