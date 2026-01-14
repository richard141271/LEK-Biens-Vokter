// LEK-Honning™️ Statue Sokkel
// En verdig base for Vokter-bien!

// --- INNSTILLINGER ---
base_width = 80;   // Bredde på sokkelen (mm)
base_depth = 80;   // Dybde på sokkelen (mm)
base_height = 25;  // Høyde på sokkelen (mm)

text_string = "LEK-Honning™";
text_size = 8;
text_depth = 1.0; // Hvor dypt teksten er inngravert

// --- KODE ---

$fn = 60;

difference() {
    // Selve klossen
    rounded_cube(base_width, base_depth, base_height, 3);
    
    // Tekst på forsiden
    translate([base_width/2, 1, base_height/2]) // Plasser midt på forsiden
    rotate([90, 0, 0]) // Roter opp så den står på veggen
    linear_extrude(height = 2) {
        text(text_string, size = text_size, valign = "center", halign = "center", font = "Arial:style=Bold");
    }
}

// Hjelpe-modul for avrundet boks
module rounded_cube(x, y, z, r) {
    translate([r, r, 0])
    minkowski() {
        cube([x - 2*r, y - 2*r, z - 1]); // z-1 fordi cylinder legger til høyde? Nei, minkowski...
        cylinder(r=r, h=1);
    }
}
