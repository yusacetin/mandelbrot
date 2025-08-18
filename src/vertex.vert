#version 300 es
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