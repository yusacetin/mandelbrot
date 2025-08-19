/*
This file is part of Mandelbrot Explorer.
Mandelbrot Explorer is free software: you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Mandelbrot Explorer is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Mandelbrot Explorer. If not, see <https://www.gnu.org/licenses/>.
*/

import init, {JsInterface} from "./pkg/mandelbrot.js"

let mandelbrot;
let panel_visible = true;

async function run() {
    await init();

    mandelbrot = new JsInterface();
    mandelbrot.draw();

    // Adjust to new window size when resized
    {
        window.addEventListener("resize", () => {
            mandelbrot.adjust_window_size();
        });
    }

    // Movement by mouse drag
    {
        let dragging = false;
        let prev_x = 0.0;
        let prev_y = 0.0;

        let webgl_canvas = document.getElementById("webgl_canvas");

        // When mouse button is pressed, we start the drag state
        webgl_canvas.addEventListener("mousedown", (e) => {
            if (e.button !== 0) {
                // Only accept left click
                return;
            }
            dragging = true;
            prev_x = e.clientX;
            prev_y = e.clientY;
            webgl_canvas.style.cursor = "move";
        });

        // When mouse button is released, we end the drag state
        webgl_canvas.addEventListener("mouseup", (e) => {
            if (e.button !== 0) {
                return;
            }
            dragging = false;
            webgl_canvas.style.cursor = "default";
        });

        // When cursor leaves the screen, we should end the drag state to not cause confusion
        webgl_canvas.addEventListener("mouseleave", (e) => {
            if (e.button !== 0) {
                return;
            }
            if (e.relatedTarget && e.relatedTarget.id === "control_panel") {
                return;
            }
            if (e.relatedTarget && e.relatedTarget.id === "show_button") {
                return;
            }
            dragging = false;
            webgl_canvas.style.cursor = "default";
        }); 

        // If in drag mode, move the canvas
        // If not, don't do anything
        webgl_canvas.addEventListener("mousemove", (e) => {
            if (!dragging) {
                return;
            }

            let w = window.innerWidth;
            let h = window.innerHeight;

            let dx = (prev_x - e.clientX) * 2;
            let dy = (e.clientY - prev_y) * 2;
            if (w >= h) {
                dx /= h;
                dy /= h;
            } else {
                dx /= w;
                dy /= w;
            }

            prev_x = e.clientX;
            prev_y = e.clientY;

            mandelbrot.move_center(dx, dy);
            update_center_inputs();
        });
    }

    // Zoom in and out by scrolling over the canvas
    {
        let webgl_canvas = document.getElementById("webgl_canvas");
        webgl_canvas.addEventListener("wheel", function(e) {
            e.preventDefault();
            let step = mandelbrot.get_zoom() / 3.5;
            if (e.deltaY < 0) {step *= -1;}

            let normalized_x = (e.clientX - window.innerWidth/2) / (window.innerWidth / 2);
            let normalized_y = (window.innerHeight/2 - e.clientY) / (window.innerHeight / 2);

            mandelbrot.zoom(step, normalized_x, normalized_y);
            update_center_inputs();
            update_zoom_input();
        });
    }

    let touch_zooming = false; // cancel touch moving if zooming

    // Touchscreen move
    {
        let webgl_canvas = document.getElementById("webgl_canvas");

        let dragging = false;
        let prev_x = 0.0;
        let prev_y = 0.0;

        // On first touch, begin dragging mode
        webgl_canvas.addEventListener("touchstart", function(e) {
            if (e.touches.length !== 1) {
                return;
            }

            dragging = true;
            prev_x = e.touches[0].clientX;
            prev_y = e.touches[0].clientY;
        });

        // Exit dragging mode when touch event ends
        webgl_canvas.addEventListener("touchend", function(e) {
            dragging = false;
        });

        webgl_canvas.addEventListener("touchcancel", function(e) {
            dragging = false;
        });

        // Handle drag event if in dragging mode
        webgl_canvas.addEventListener("touchmove", function(e) {
            e.preventDefault();
            if (!dragging) {
                return;
            }
            if (touch_zooming) {
                return;
            }

            const cur_x = e.touches[0].clientX;
            const cur_y = e.touches[0].clientY;

            let w = window.innerWidth;
            let h = window.innerHeight;

            let dx = (prev_x - cur_x) * 2;
            let dy = (cur_y - prev_y) * 2;
            if (w >= h) {
                dx /= h;
                dy /= h;
            } else {
                dx /= w;
                dy /= w;
            }

            prev_x = cur_x;
            prev_y = cur_y;

            mandelbrot.move_center(dx, dy);
            update_center_inputs();
        });
    }

    // Touchscreen zoom
    {
        // helper function
        function get_distance(touch0, touch1) {
            const dx = touch0.clientX - touch1.clientX;
            const dy = touch0.clientY - touch1.clientY;
            return Math.sqrt(dx*dx + dy*dy);
        }

        let webgl_canvas = document.getElementById("webgl_canvas");

        let prev_dist = 0.0;

        webgl_canvas.addEventListener("touchstart", function(e) {
            if (e.touches.length === 2) {
                prev_dist = get_distance(e.touches[0], e.touches[1]);
            }
        });

        webgl_canvas.addEventListener("touchmove", function(e) {
            if (e.touches.length !== 2) {
                return;
            }

            e.preventDefault();
            touch_zooming = true;
            const cur_r = mandelbrot.get_zoom();
            const step_coef = 0.008 * cur_r;

            // Calculate difference in current and previous distance
            const cur_dist = get_distance(e.touches[0], e.touches[1]);
            const ddist_raw = cur_dist - prev_dist;
            const ddist = ddist_raw * step_coef;

            // Calculate center of pinch gesture
            let center_x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let center_y = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            let w = window.innerWidth;
            let h = window.innerHeight;

            center_x -= w/2;
            center_y -= h/2;
            center_y *= -1;

            if (w >= h) {
                center_x /= h;
                center_y /= h;
            } else {
                center_x /= w;
                center_y /= w;
            }

            center_x *= 2;
            center_y *= 2;

            mandelbrot.zoom(-ddist, center_x, center_y);
            update_zoom_input();

            prev_dist = cur_dist;
        });

        webgl_canvas.addEventListener("touchend", function(e) {
            prev_dist = 0.0;
            touch_zooming = false;
        });
    }

    // Go to position with "Go" button
    {
        let go_button = document.getElementById("go_button");
        go_button.addEventListener("click", (e) => {
            let x = document.getElementById("center_x_input").value;
            let y = document.getElementById("center_y_input").value;
            let zoom = document.getElementById("zoom_input").value;
            mandelbrot.set_center(x, y);
            mandelbrot.set_zoom(zoom);
        });
    }

    // Toggle fullscreen
    {
        let fs_button = document.getElementById("fs_button");
        fs_button.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen();
        } else {
            // Exit fullscreen
            document.exitFullscreen();
        }
        });
    }

    // Hide panel button
    {
        let hide_button = document.getElementById("hide_button");
        hide_button.addEventListener("click", (e) => {
            let panel = document.getElementById("control_panel");
            panel.setAttribute("style", "display: none;");

            let show_button = document.getElementById("show_button");
            show_button.removeAttribute("style");

            panel_visible = false;
        });
    }

    // Show panel button
    {
        let show_button = document.getElementById("show_button");
        show_button.addEventListener("click", (e) => {
            let panel = document.getElementById("control_panel");
            panel.removeAttribute("style");

            show_button.setAttribute("style", "display: none;");

            panel_visible = true;

            update_center_inputs();
            update_zoom_input();
        });
    }

    // Read properties from program
    {
        update_center_inputs();
        update_zoom_input();
    }

    // Reset button
    {
        let reset_button = document.getElementById("reset_button");
        reset_button.addEventListener("click", (e) => {
            mandelbrot.set_center(-0.5, 0.0);
            mandelbrot.set_zoom(1.0);
            update_center_inputs();
            update_zoom_input();
        });
    }
}

// Helper functions

function update_center_inputs() {
    if (!panel_visible) {
        return;
    }
    let cx = document.getElementById("center_x_input");
    let cy = document.getElementById("center_y_input");
    cx.value = truncate_value(mandelbrot.get_center_x());
    cy.value = truncate_value(mandelbrot.get_center_y());
}

function update_zoom_input() {
    if (!panel_visible) {
        return;
    }
    let zoom_input = document.getElementById("zoom_input");
    let zoom = mandelbrot.get_zoom();
    if (zoom <= 0.000001) {
        zoom = 0.000001;
    }
    zoom_input.value = truncate_value(zoom);
}

function truncate_value(val) {
    let val_str = String(val);
    let decimal_pos = val_str.indexOf(".");
    const limit = 10;
    if (val_str.length - decimal_pos > limit) {
        val_str = val_str.substring(0, decimal_pos + limit);
    }
    return Number(val_str);
}

run();