/*
This file is part of Mandelbrot Explorer.
Mandelbrot Explorer is free software: you can redistribute it and/or modify it under the terms of the GNU General Public
License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Mandelbrot Explorer is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Mandelbrot Explorer. If not, see <https://www.gnu.org/licenses/>.
*/

#![allow(unused_parens)]
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Window, Document, HtmlCanvasElement, WebGl2RenderingContext, WebGlShader, WebGlProgram};

/////////////////////////
// WASM - JS Interface //
/////////////////////////

#[wasm_bindgen]
pub struct JsInterface {
    mandelbrot: Mandelbrot
}

#[wasm_bindgen]
impl JsInterface {
    #[wasm_bindgen(constructor)]
    pub fn new() -> JsInterface {
        return JsInterface {
            mandelbrot: Mandelbrot::new()
        };
    }

    pub fn draw(&self) {
        self.mandelbrot.draw();
    }

    pub fn adjust_window_size(&self) {
        self.mandelbrot.adjust_window_size();
    }

    pub fn move_center(&mut self, dx: f32, dy: f32) {
        self.mandelbrot.move_center(dx, dy);
    }

    pub fn zoom(&mut self, val: f32, mx: f32, my: f32) {
        self.mandelbrot.zoom(val, mx, my);
    }

    pub fn set_zoom(&mut self, val: f32) {
        self.mandelbrot.zoom = val;
        self.draw();
    }

    pub fn get_zoom(&self) -> f32 {
        return self.mandelbrot.zoom;
    }

    pub fn get_center_x(&self) -> f32 {
        return self.mandelbrot.center.x;
    }

    pub fn get_center_y(&self) -> f32 {
        return self.mandelbrot.center.y;
    }

    pub fn set_center(&mut self, x: f32, y: f32) {
        self.mandelbrot.center.x = x;
        self.mandelbrot.center.y = y;
        self.mandelbrot.draw();
    }
}

///////////////////
// Helper Struct //
///////////////////

struct Point {
    x: f32,
    y: f32
}

//////////////////////////////////////////
// Mandelbrot Struct and Implementation //
//////////////////////////////////////////

struct Mandelbrot {
    context: WebGl2RenderingContext,
    program: WebGlProgram,
    window: Window,
    canvas: HtmlCanvasElement,
    center: Point,
    zoom: f32
}

impl Mandelbrot {
    pub fn new() -> Mandelbrot {
        // Get elements
        let window: Window = web_sys::window().unwrap();
        let document: Document = window.document().unwrap();
        let canvas: HtmlCanvasElement = document.get_element_by_id("webgl_canvas").unwrap().dyn_into::<HtmlCanvasElement>().expect("Failed to get canvas");
        let context: WebGl2RenderingContext = canvas.get_context("webgl2").expect("Failed to get context").unwrap().dyn_into().expect("Failed to get context");

        // Compile vertex shader
        let vertex_shader_src: &str = include_str!("vertex.vert");
        let vertex_shader: WebGlShader = compile_shader(&context, vertex_shader_src, WebGl2RenderingContext::VERTEX_SHADER).map_err(|e: String| JsValue::from_str(&e)).expect("Failed to compile vertex shader");

        // Compile color shader
        let frag_shader_src: &str = include_str!("fragment.frag");
        let frag_shader: WebGlShader = compile_shader(&context, frag_shader_src, WebGl2RenderingContext::FRAGMENT_SHADER).map_err(|e: String| JsValue::from_str(&e)).expect("Failed to compile fragment shader");

        // Link program
        let program: WebGlProgram = link_program(&context, &vertex_shader, &frag_shader).map_err(|e: String| JsValue::from_str(&e)).expect("Failed to link program");
        context.use_program(Some(&program));

        // Set window size
        let dpr: f64 = window.device_pixel_ratio();
        let w: u32 = (window.inner_width().expect("Failed to get inner width").as_f64().unwrap() * dpr) as u32;
        let h: u32 = (window.inner_height().expect("Failed to get inner height").as_f64().unwrap() * dpr) as u32;
        canvas.set_width(w);
        canvas.set_height(h);
        context.viewport(0, 0, w as i32, h as i32);

        return Mandelbrot {
            context: context,
            program: program,
            window: window,
            canvas: canvas,
            center: Point {
                x: -0.5,
                y: 0.0
            },
            zoom: 1.0
        };
    }

    pub fn draw(&self) {
        // Using two triangles to draw on the whole screen
        let bounds: [f32; 12] = [
            -1.0, -1.0,  // bottom left
            1.0, -1.0,  // bottom right
            -1.0,  1.0,  // top left
            -1.0,  1.0,  // top left
            1.0, -1.0,  // bottom right
            1.0,  1.0,  // top right
        ];

        // Set up vertex buffer
        let buffer: web_sys::WebGlBuffer = self.context.create_buffer().ok_or("failed to create buffer").expect("error");
        self.context.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&buffer));
        unsafe {
            let verts: js_sys::Float32Array = js_sys::Float32Array::view(&bounds);
            self.context.buffer_data_with_array_buffer_view(WebGl2RenderingContext::ARRAY_BUFFER, &verts, WebGl2RenderingContext::STATIC_DRAW);
        }

        // Link pos to buffer
        let pos_attrib: u32 = self.context.get_attrib_location(&self.program, "i_pos") as u32;
        self.context.enable_vertex_attrib_array(pos_attrib);
        self.context.vertex_attrib_pointer_with_i32(pos_attrib, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);

        // Clear canvas
        self.context.clear_color(0.1, 0.1, 0.1, 1.0);
        self.context.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT);

        // Set vertex shader uniforms
        self.context.uniform2f(Some(&self.context.get_uniform_location(&self.program, "center").expect("Failed to get uniform center")), self.center.x, self.center.y);
        self.context.uniform1f(Some(&self.context.get_uniform_location(&self.program, "zoom").expect("Failed to get uniform center")), self.zoom);
        let dpr: f64 = self.window.device_pixel_ratio();
        let w: f32 = (self.window.inner_width().expect("Failed to get inner width").as_f64().unwrap() * dpr) as f32;
        let h: f32 = (self.window.inner_height().expect("Failed to get inner height").as_f64().unwrap() * dpr) as f32;
        self.context.uniform1f(Some(&self.context.get_uniform_location(&self.program, "w").expect("Failed to get uniform w")), w);
        self.context.uniform1f(Some(&self.context.get_uniform_location(&self.program, "h").expect("Failed to get uniform h")), h);

        let mut max_iter: f32 = 100.0 / self.zoom.sqrt();
        if (max_iter > 3000.0) {
            max_iter = 3000.0;
        }
        //web_sys::console::log_1(&format!("zoom: {}", self.zoom).into());
        //web_sys::console::log_1(&format!("max_iter: {}", max_iter).into());
        self.context.uniform1f(Some(&self.context.get_uniform_location(&self.program, "max_iter").expect("Failed to get uniform center")), max_iter);

        // Draw buffer
        self.context.draw_arrays(WebGl2RenderingContext::TRIANGLES, 0, 6);
    }

    pub fn adjust_window_size(&self) {
        let dpr: f64 = self.window.device_pixel_ratio();
        let w: u32 = (self.window.inner_width().expect("Failed to get inner width").as_f64().unwrap() * dpr) as u32;
        let h: u32 = (self.window.inner_height().expect("Failed to get inner height").as_f64().unwrap() * dpr) as u32;
        self.canvas.set_width(w);
        self.canvas.set_height(h);
        self.context.viewport(0, 0, w as i32, h as i32);
        self.draw();
    }

    pub fn move_center(&mut self, dx: f32, dy: f32) {
        self.center.x += dx * self.zoom;
        self.center.y += dy * self.zoom;
        self.draw();
    }

    // Adjust zoom and the new location of the center so that
    // the zoom effect appears as originating from the cursor location
    // mx = mouse x, my = mouse y
    pub fn zoom(&mut self, val: f32, mx: f32, my: f32) {
        let prev_zoom: f32 = self.zoom;
        self.zoom += val;

        if (self.zoom < 0.000001) {
            self.zoom = 0.000001;
        } else if (self.zoom > 5.0) {
            self.zoom = 5.0;
        }
        
        // Get window dimensions for aspect ratio
        let dpr: f64 = self.window.device_pixel_ratio();
        let w: f32 = (self.window.inner_width().expect("Failed to get inner width").as_f64().unwrap() * dpr) as f32;
        let h: f32 = (self.window.inner_height().expect("Failed to get inner height").as_f64().unwrap() * dpr) as f32;

        // Calculate the world coordinate (p_world) under the mouse before the zoom
        let p_world_x: f32;
        let p_world_y: f32;

        if (w >= h) {
            p_world_x = (mx * (w / h) * prev_zoom) + self.center.x;
            p_world_y = (my * prev_zoom) + self.center.y;
        } else {
            p_world_x = (mx * prev_zoom) + self.center.x;
            p_world_y = (my * (h / w) * prev_zoom) + self.center.y;
        }

        // Calculate the new center required to keep p_world under the mouse
        // at the new zoom level. We rearrange the formula:
        // p_world.x = (mx * aspect * new_zoom) + new_center.x -->
        // new_center.x = p_world.x - (mx * aspect * new_zoom)
        if (w >= h) {
            self.center.x = p_world_x - (mx * (w / h) * self.zoom);
            self.center.y = p_world_y - (my * self.zoom);
        } else {
            self.center.x = p_world_x - (mx * self.zoom);
            self.center.y = p_world_y - (my * (h / w) * self.zoom);
        }

        self.draw();
    }
}

//////////////////////
// Helper functions //
//////////////////////

fn compile_shader(gl: &WebGl2RenderingContext, source: &str, shader_type: u32) -> Result<WebGlShader, String> {
    let shader: WebGlShader = gl.create_shader(shader_type).ok_or("Unable to create shader")?;
    gl.shader_source(&shader, source);
    gl.compile_shader(&shader);

    if (gl.get_shader_parameter(&shader, WebGl2RenderingContext::COMPILE_STATUS).as_bool().unwrap_or(false)) {
        return Ok(shader);
    } else {
        return Err(gl.get_shader_info_log(&shader).unwrap_or_default());
    }
}

fn link_program(gl: &WebGl2RenderingContext, vertex_shader: &WebGlShader, fragment_shader: &WebGlShader) -> Result<WebGlProgram, String> {
    let program: WebGlProgram = gl.create_program().ok_or("Failed to create program")?;
    gl.attach_shader(&program, vertex_shader);
    gl.attach_shader(&program, fragment_shader);
    gl.link_program(&program);

    if (gl.get_program_parameter(&program, WebGl2RenderingContext::LINK_STATUS).as_bool().unwrap_or(false)) {
        Ok(program)
    } else {
        Err(gl.get_program_info_log(&program).unwrap_or_default())
    }
}