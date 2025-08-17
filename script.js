import init, {JsInterface} from "./pkg/mandelbrot.js"

let mandelbrot;

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
        });
    }

    // Zoom in and out by scrolling over the canvas
    {
        let webgl_canvas = document.getElementById("webgl_canvas");
        webgl_canvas.addEventListener("wheel", function(e) {
            e.preventDefault();
            let step = mandelbrot.get_zoom() / 5.0;
            if (e.deltaY < 0) {step *= -1;}

            let normalized_x = (e.clientX - window.innerWidth/2) / (window.innerWidth / 2);
            let normalized_y = (window.innerHeight/2 - e.clientY) / (window.innerHeight / 2);

            mandelbrot.zoom(step, normalized_x, normalized_y);
        });
    }
}

run();