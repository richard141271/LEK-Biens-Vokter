// LEK-Såpe™️ Rektangel Form (CHAMFER FIX)
// Perfekte slippvinkler på teksten.

// --- INNSTILLINGER ---

soap_width = 75;  
soap_length = 50; 
soap_height = 36; 

wall_thickness = 3; 
base_thickness = 4;
draft_angle = 1.05; 

// Tekst
text_string = "LEK";
text_size = 20;
text_depth = 2; 

$fn = 30;

// Modul for å lage tekst med skrå kanter (chamfer)
module chamfered_text() {
    minkowski() {
        linear_extrude(height = 0.1)
            text(text_string, size = text_size, valign = "center", halign = "center", font = "Times New Roman:style=Bold");
        
        // Kjeglen som lager skråkanten
        cylinder(r1=text_depth/1.5, r2=0, h=text_depth); 
    }
}

module soap_cavity() {
    linear_extrude(height = soap_height, scale = draft_angle) {
        offset(r = 2) {
            square([soap_width-4, soap_length-4], center = true);
        }
    }
}

module mold() {
    difference() {
        // Ytre skall
        translate([0, 0, soap_height/2 + base_thickness/2])
        cube([
            soap_width * draft_angle + wall_thickness*2, 
            soap_length * draft_angle + wall_thickness*2, 
            soap_height + base_thickness
        ], center=true);

        // Hulrommet
        translate([0, 0, base_thickness])
        soap_cavity();

        // Teksten i bunnen (Med perfekt chamfer)
        translate([0, 0, base_thickness - 0.1]) // Flyttet litt ned for å kutte rent
        mirror([1, 0, 0])
        chamfered_text();
    }
}

mold();
