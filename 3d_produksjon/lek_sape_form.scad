// LEK-Såpe™️ Form Generator
// Laget av Trae & User for LEK-Biens Vokter

// --- INNSTILLINGER ---

// Såpens dimensjoner (i mm)
soap_width = 80;
soap_height = 55;
soap_depth = 25; // Tykkelsen på selve såpen
corner_radius = 5; // Hvor avrundet hjørnene skal være

// Formens innstillinger
wall_thickness = 4; // Hvor tykk plastveggen i formen skal være
base_thickness = 4; // Tykkelse på bunnen av formen

// Tekst innstillinger
text_string = "LEK-Sape"; // Teksten som skal stå (bruk a for å, vi fikser æøå senere om fonten støtter det)
text_size = 12;
text_depth = 1.5; // Hvor dypt teksten skal gå inn i såpen (som betyr hvor mye den stikker opp i formen)

// --- KODE (IKKE ENDRE UNDER HER MED MINDRE DU VET HVA DU GJØR) ---

$fn = 60; // Gjør sirkler glatte

module rounded_cube(x, y, z, r) {
    translate([r, r, 0])
    minkowski() {
        cube([x - 2*r, y - 2*r, z / 2]); // z/2 because cylinder adds height? No, minkowski sums them.
        cylinder(r=r, h=z/2);
    }
}

module soap_shape() {
    // Lager selve såpeformen (positiv)
    hull() {
        translate([corner_radius, corner_radius, 0]) cylinder(r=corner_radius, h=soap_depth);
        translate([soap_width-corner_radius, corner_radius, 0]) cylinder(r=corner_radius, h=soap_depth);
        translate([soap_width-corner_radius, soap_height-corner_radius, 0]) cylinder(r=corner_radius, h=soap_depth);
        translate([corner_radius, soap_height-corner_radius, 0]) cylinder(r=corner_radius, h=soap_depth);
    }
}

module mold() {
    difference() {
        // Ytre skall (Boksen)
        translate([-wall_thickness, -wall_thickness, 0])
        cube([
            soap_width + wall_thickness*2, 
            soap_height + wall_thickness*2, 
            soap_depth + base_thickness
        ]);

        // Hulrommet (Såpen)
        translate([0, 0, base_thickness])
        soap_shape();
    }
    
    // Legg til tekst i bunnen
    // Teksten må være SPEILVENDT i formen for å bli rett på såpen.
    // Hvis teksten skal gå INN i såpen, må den stikke OPP i formen.
    translate([soap_width/2, soap_height/2, base_thickness])
    mirror([1, 0, 0]) // Speilvender teksten
    linear_extrude(height = text_depth)
    text(text_string, size = text_size, valign = "center", halign = "center", font = "Arial:style=Bold");
}

// Generer formen
mold();

// --- INSTRUKSJONER FOR LOGO ---
/*
For å få inn LEK-Honning logoen:
1. Konverter logoen til SVG-format (bruk f.eks. Inkscape).
2. Bruk 'import("filnavn.svg");' i stedet for text()-kommandoen.
3. Eksempel:
   translate([soap_width/2, soap_height/2, base_thickness])
   mirror([1,0,0])
   linear_extrude(height = text_depth)
   import("lek_logo.svg", center=true);
*/
