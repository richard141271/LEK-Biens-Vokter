// LEK-Såpe™️ Sekskant Form - MED KANT (CHAMFER FIX)
// Denne versjonen bruker minkowski() for å lage perfekte slippvinkler på teksten.
// Dette hindrer at bokstavene "låser" såpen fast.

// --- INNSTILLINGER ---

soap_width = 60;      
soap_height = 45;     

// Design
rim_width = 6;        
recess_depth = 3;     

// Vegger og bunn
wall_thickness = 3;
base_thickness = 4;

// Slippvinkler (Scale)
wall_scale = 1.05;    
island_scale = 0.90;  

// Tekst
text_string = "LEK";
text_size = 18;
text_depth = 2; // Litt dypere for å få tydelig chamfer

$fn = 30; // Senket litt for å gjøre rendering raskere (minkowski er treg)

module hexagon_shape(w) {
    rotate([0,0,30])
    circle(d = w / 0.866, $fn=6);
}

// Modul for å lage tekst med skrå kanter (chamfer)
module chamfered_text() {
    // Vi lager teksten flat
    // Så bruker vi minkowski til å legge til en kjegleform på den
    
    minkowski() {
        linear_extrude(height = 0.1)
            text(text_string, size = text_size, valign = "center", halign = "center", font = "Times New Roman:style=Bold");
        
        // Kjeglen som lager skråkanten
        cylinder(r1=text_depth/1.5, r2=0, h=text_depth); 
    }
}

module build_mold_fixed() {
    difference() {
        union() {
            // 1. BUNNPLATE
            cylinder(r=(soap_width/1.5) + wall_thickness + 5, h=base_thickness);

            // 2. VEGGENE
            translate([0,0,base_thickness])
            linear_extrude(height=soap_height, scale=wall_scale) {
                difference() {
                    offset(r=wall_thickness) hexagon_shape(soap_width); 
                    hexagon_shape(soap_width); 
                }
            }

            // 3. "ØYA" (Plattingen)
            translate([0,0,base_thickness])
            linear_extrude(height=recess_depth, scale=island_scale) {
                hexagon_shape(soap_width - (rim_width*2));
            }
        }

        // 4. TEKSTEN (Med perfekt chamfer)
        // Vi må flytte den litt ned for at chamferen skal kutte riktig
        translate([0, 0, base_thickness + recess_depth - text_depth + 0.1])
        mirror([1,0,0]) // Speilvend
        chamfered_text();
    }
}

build_mold_fixed();
