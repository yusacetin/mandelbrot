#version 300 es
precision highp float;

in vec2 pos_norm;
out vec4 o_color;

uniform float max_iter;

void main() {
    float c_real = pos_norm.x;
    float c_imag = pos_norm.y;

    vec2 z = vec2(0.0, 0.0);
    
    int max_iter_int = int(max_iter);
    int i;
    for (i = 0; i < max_iter_int; i++) {
        // (x + yi)^2 =
        // x^2 + 2xyi + y^2i^2 =
        // x^2 + 2xyi - y^2
        float z_next_real = z.x * z.x - z.y * z.y + c_real;
        float z_next_imag = 2.0 * z.x * z.y + c_imag;
        
        z.x = z_next_real;
        z.y = z_next_imag;

        if (dot(z, z) > 4.0) { // Same as sqrt(z.x * z.x + z.y * z.y) > 2.0 but faster
            break;
        }
    }

    float r = sin(0.05);
    float g = sin(0.08);
    float b = sin(0.14);
    if (i < max_iter_int) {
        // Calculate the smooth iteration count
        float smooth_i = float(i) + 1.0 - log(log(length(z))) / log(2.0);

        // Define a frequency for the color palette
        // Smaller --> wider, softer bands
        // Larger --> tighter, more numerous bands
        float frequency = 0.03;

        // Create a colorful palette using sine waves
        r = sin(smooth_i * frequency + 0.05);
        g = sin(smooth_i * frequency + 0.08);
        b = sin(smooth_i * frequency + 0.14);
    }

    o_color = vec4(r, g, b, 1.0);
}
