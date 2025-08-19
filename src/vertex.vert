#version 300 es

/*
This file is part of Mandelbrot Explorer.
Mandelbrot Explorer is free software: you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Mandelbrot Explorer is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Mandelbrot Explorer. If not, see <https://www.gnu.org/licenses/>.
*/

precision highp float;

in vec2 i_pos;
out vec2 pos_norm;

uniform vec2 center;
uniform float zoom;

uniform float w; // window width in pixels
uniform float h; // window height in pixels

void main() {
    if (w >= h) {
        pos_norm.x = i_pos.x * (w / h);
        pos_norm.y = i_pos.y;
    } else {
        pos_norm.x = i_pos.x;
        pos_norm.y = i_pos.y * (h / w);
    }

    pos_norm.x *= zoom;
    pos_norm.y *= zoom;
    pos_norm.x += center.x;
    pos_norm.y += center.y;

    gl_Position = vec4(i_pos, 0.0, 1.0);
}